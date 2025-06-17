import { PermitReward } from "@ubiquity-os/permit-generation";
import { ethers } from "ethers";
import { PostOrderParams } from "../../../../../shared/api-types";
import { giftCardTreasuryAddress, permit2Address, ubiquityDollarChainAddresses } from "../../../../../shared/constants";
import { getGiftCardOrderId, getMintMessageToSign, isGiftCardAvailable } from "../../../../../shared/helpers";
import { getTotalPriceOfValue } from "../../../../../shared/pricing";
import { GiftCard } from "../../../../../shared/types";
import { postOrder } from "../../../shared/api";
import { permit2Abi } from "../../abis";
import { app, AppState } from "../../app-state";
import { init } from "../../init";
import { toaster } from "../../toaster";
import { checkPermitClaimable, transferFromPermit } from "../../web3/erc20-permit";
import { getApiBaseUrl, getUserCountryCode } from "../helpers";
import { completeOrder, getPendingOrder, updatePendingOrder } from "../order-storage";
import { MintParams } from "../types";
import { getActivePermit } from "../utils";

export async function mint(giftCard: GiftCard) {
  const country = await getUserCountryCode();
  if (!country) {
    toaster.create("error", "Failed to detect your location to pick a suitable card for you.");
    return;
  }

  const value = (document.getElementById("value") as HTMLInputElement).value;
  const price = getTotalPriceOfValue(Number(value), giftCard);
  const activePermit = getActivePermit();

  if (!isGiftCardAvailable(giftCard, ethers.utils.parseEther(price.toString()))) {
    if (activePermit) {
      toaster.create("error", "This gift card is not available in your permit amount.");
    } else {
      toaster.create("error", "This gift card is not available in the given amount.");
    }
    return;
  }

  console.log(`Minting gift card with amount: ${value}, price: ${price} for product ID: ${giftCard.productId}`);

  if (typeof window.ethereum === "undefined") {
    throw new Error("MetaMask is not installed. Please install it to proceed.");
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    // ethers.js v5 way to get provider and signer from window.ethereum
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId); // Ensure chainId is a number

    console.log(`Connected to chainId: ${chainId}`);

    if (activePermit) {
      console.log("Using active permit for minting gift card.", activePermit);

      await mintWithPermit(giftCard, activePermit);

      toaster.create("success", `Success. Your gift card will be available for redeem in your cards in a few minutes.`);

      return;
    }

    const ubiquityDollarAddress = ubiquityDollarChainAddresses[chainId];
    if (!ubiquityDollarAddress) {
      toaster.create("error", "You are not on the correct network to mint the card.");
      return;
    }
    console.log(`Ubiquity Dollar contract address: ${ubiquityDollarAddress}`);

    const ubiquityDollarAbi = ["function transfer(address recipient, uint256 amount) returns (bool)"];

    const ubiquityDollarContract = new ethers.Contract(ubiquityDollarAddress, ubiquityDollarAbi, signer);

    const amountToTransfer = ethers.utils.parseEther(price.toString());

    console.log(`Attempting to transfer ${ethers.utils.formatEther(amountToTransfer)} UUSD to ${giftCardTreasuryAddress}`);

    const pendingOrder = await getPendingOrder(giftCard.productId);

    console.log("Pending order of product:", pendingOrder);
    let tx, txHash;
    if (pendingOrder) {
      txHash = pendingOrder.txHash;
      console.log(`Using existing transaction hash: ${txHash}`);
    } else {
      tx = await ubiquityDollarContract.transfer(giftCardTreasuryAddress, amountToTransfer);
      txHash = tx.hash;
    }

    const mintArgs: MintParams = {
      type: "ubiquity-dollar",
      chainId: provider.network.chainId,
      txHash: txHash,
      productId: giftCard.productId,
      country,
      retryCount: pendingOrder && pendingOrder.retryCount ? pendingOrder.retryCount + 1 : 1,
    };

    await updatePendingOrder(mintArgs, price);

    if (tx) {
      await tx.wait();
      console.log("Transaction successful:", tx.hash);
    }

    const order = await postOrder(mintArgs);
    if (!order) {
      toaster.create("error", "Order failed. Try again later.");
      return;
    }

    toaster.create("success", `Success. Your gift card will be available for redeem in your cards in a few minutes.`);

    await completeOrder(giftCard.productId, order.transactionId);
  } catch (error) {
    console.error("Error minting gift card:", error);
    throw error; // Re-throw the error for further handling
  }
}

export async function mintWithPermit(giftCard: GiftCard, activePermit: PermitReward) {
  if (!app.signer) {
    toaster.create("error", "Connect your wallet.");
    return;
  }

  const country = await getUserCountryCode();
  if (!country) {
    toaster.create("error", "Failed to detect your location to pick a suitable card for you.");
    return;
  }

  const pendingOrder = await getPendingOrder(giftCard.productId);

  console.log("Pending order of product:", pendingOrder);
  let tx, txHash;
  if (pendingOrder) {
    txHash = pendingOrder.txHash;
    console.log(`Using existing transaction hash: ${txHash}`);
  } else {
    tx = await claimPermitToCardTreasury(app);
    txHash = tx.hash;
  }

  const mintParams: MintParams = {
    type: "permit",
    chainId: app.signer.provider.network.chainId,
    txHash,
    productId: giftCard.productId,
    country: country,
    retryCount: pendingOrder && pendingOrder.retryCount ? pendingOrder.retryCount + 1 : 1,
  };

  await updatePendingOrder(mintParams, Number(ethers.utils.formatEther(activePermit.amount)));

  if (tx) {
    await tx.wait();
    console.log("Transaction successful:", tx.hash);
  }

  let signedMessage;
  try {
    signedMessage = await app.signer.signMessage(getMintMessageToSign("permit", app.signer.provider.network.chainId, txHash, giftCard.productId, country));
  } catch (error) {
    toaster.create("error", "You did not sign the message to mint a payment card.");
    return;
  }

  const order = await postOrder({
    signedMessage: signedMessage,
    ...mintParams,
  } as PostOrderParams);

  if (!order) {
    toaster.create("error", "Order failed. Try again in a few minutes.");
    return;
  }
  await checkForMintingDelay(mintParams, order.transactionId);
}

async function checkForMintingDelay(mintParams: MintParams, txId: number) {
  if (await hasMintingFinished(mintParams)) {
    await completeOrder(mintParams.productId, txId);
    await init();
  } else {
    const interval = setInterval(async () => {
      if (await hasMintingFinished(mintParams)) {
        clearInterval(interval);
        await init();
      } else {
        toaster.create("info", "Minting is in progress. Please wait...");
      }
    }, 10000);
    toaster.create("info", "Minting is in progress. Please wait...");
  }
}

async function claimPermitToCardTreasury(app: AppState) {
  if (!app.signer) {
    toaster.create("error", "Connect your wallet.");
    return;
  }
  const isClaimable = await checkPermitClaimable(app);
  if (isClaimable) {
    const permit2Contract = new ethers.Contract(permit2Address, permit2Abi, app.signer);
    if (!permit2Contract) return;

    const reward = {
      ...app.reward,
    };
    reward.beneficiary = giftCardTreasuryAddress;

    const tx = await transferFromPermit(permit2Contract, reward, "Processing... Please wait. Do not close this page.");
    if (!tx) return;
    return tx;
  } else {
    console.error("Permit is not claimable.");
  }
}

async function hasMintingFinished(mintParams: MintParams): Promise<boolean> {
  const retrieveOrderUrl = `${getApiBaseUrl()}/get-order?orderId=${getGiftCardOrderId(app.reward.beneficiary, mintParams.txHash, mintParams.retryCount)}`;
  const orderResponse = await fetch(retrieveOrderUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return orderResponse.status != 404;
}
