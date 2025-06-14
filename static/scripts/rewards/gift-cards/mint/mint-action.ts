import { PermitReward } from "@ubiquity-os/permit-generation";
import { ethers } from "ethers";
import { PostOrderParams } from "../../../../../shared/api-types";
import { giftCardTreasuryAddress, permit2Address } from "../../../../../shared/constants";
import { getGiftCardOrderId, getMintMessageToSign } from "../../../../../shared/helpers";
import { GiftCard } from "../../../../../shared/types";
import { postOrder } from "../../../shared/api";
import { permit2Abi } from "../../abis";
import { app, AppState } from "../../app-state";
import { toaster } from "../../toaster";
import { checkPermitClaimable, transferFromPermit } from "../../web3/erc20-permit";
import { completeOrder, getPendingOrder, MintArgs, updatePendingOrder } from "../gift-card";
import { getApiBaseUrl, getUserCountryCode } from "../helpers";
import { initClaimGiftCard } from "../index";

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

  const mintArgs: MintArgs = {
    type: "permit",
    chainId: app.signer.provider.network.chainId,
    txHash,
    productId: giftCard.productId,
    country: country,
  };

  await updatePendingOrder(mintArgs, Number(ethers.utils.formatEther(activePermit.amount)));

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
    ...mintArgs,
  } as PostOrderParams);

  if (!order) {
    toaster.create("error", "Order failed. Try again in a few minutes.");
    return;
  }
  await checkForMintingDelay(giftCard.productId, order.transactionId);
}

async function checkForMintingDelay(giftCardId: number, txId: number) {
  if (await hasMintingFinished(app)) {
    await completeOrder(giftCardId, txId);
    await initClaimGiftCard(app);
  } else {
    const interval = setInterval(async () => {
      if (await hasMintingFinished(app)) {
        clearInterval(interval);
        await initClaimGiftCard(app);
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

async function hasMintingFinished(app: AppState): Promise<boolean> {
  const retrieveOrderUrl = `${getApiBaseUrl()}/get-order?orderId=${getGiftCardOrderId(app.reward.beneficiary, app.reward.signature)}`;
  const orderResponse = await fetch(retrieveOrderUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return orderResponse.status != 404;
}
