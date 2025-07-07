import { PermitReward } from "@ubiquibot/permit-generation";
import { permit2Address } from "@ubiquity-dao/rpc-handler";
import { decodeError } from "@ubiquity-os/ethers-decode-error";
import { BigNumber, BigNumberish, Contract, ethers } from "ethers";
import { erc20Abi, permit2Abi } from "../../../shared/abis";
import { app, AppState } from "../app-state";
import { errorToast, MetaMaskError, toaster } from "../common-ui/toaster";

export async function fetchTreasury(permit: PermitReward): Promise<{ balance: BigNumber; allowance: BigNumber; decimals: number; symbol: string }> {
  let balance: BigNumber, allowance: BigNumber, decimals: number, symbol: string;

  try {
    const tokenAddress = permit.tokenAddress;
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, app.provider);

    // Try to get the token info from localStorage
    const tokenInfo = localStorage.getItem(tokenAddress);

    if (tokenInfo) {
      // If the token info is in localStorage, parse it and use it
      const { decimals: storedDecimals, symbol: storedSymbol } = JSON.parse(tokenInfo);
      decimals = storedDecimals;
      symbol = storedSymbol;
      [balance, allowance] = await Promise.all([tokenContract.balanceOf(permit.owner), tokenContract.allowance(permit.owner, permit2Address)]);
    } else {
      // If the token info is not in localStorage, fetch it from the blockchain
      [balance, allowance, decimals, symbol] = await Promise.all([
        tokenContract.balanceOf(permit.owner),
        tokenContract.allowance(permit.owner, permit2Address),
        tokenContract.decimals(),
        tokenContract.symbol(),
      ]);

      // Store the token info in localStorage for future use
      localStorage.setItem(tokenAddress, JSON.stringify({ decimals, symbol }));
    }

    return { balance, allowance, decimals, symbol };
  } catch (error: unknown) {
    return { balance: BigNumber.from(-1), allowance: BigNumber.from(-1), decimals: -1, symbol: "" };
  }
}

export async function transferFromPermit(permit2Contract: Contract, reward: PermitReward, successMessage?: string) {
  const signer = app.signer;
  if (!signer) return null;

  try {
    const tx = await permit2Contract.permitTransferFrom(
      {
        permitted: {
          token: reward.tokenAddress,
          amount: reward.amount,
        },
        nonce: reward.nonce,
        deadline: reward.deadline,
      },
      { to: reward.beneficiary, requestedAmount: reward.amount },
      reward.owner,
      reward.signature
    );
    toaster.create("info", successMessage ?? `Transaction sent`);
    return tx;
  } catch (error: unknown) {
    if (error instanceof Error) {
      const e = error as unknown as MetaMaskError;
      // Check if the error message indicates a user rejection
      if (e.code == "ACTION_REJECTED") {
        // Handle the user rejection case
        toaster.create("info", `Transaction was not sent because it was rejected by the user.`);
      } else {
        console.error(e);
        const { error } = decodeError(e, permit2Abi);
        errorToast(e, `Error in permitTransferFrom: ${error}`);
      }
    }
    return null;
  }
}

export async function checkPermitClaimable(app: AppState): Promise<boolean> {
  let isClaimed: boolean;
  try {
    isClaimed = await isNonceClaimed(app);
  } catch (error: unknown) {
    console.error("Error in isNonceClaimed: ", error);
    return false;
  }

  if (isClaimed) {
    toaster.create("error", `Your reward for this task has already been claimed.`);

    return false;
  }

  const reward = app.reward;

  if (BigNumber.from(reward.deadline).lt(Math.floor(Date.now() / 1000))) {
    toaster.create("error", `This reward has expired.`);
    return false;
  }

  const { balance, allowance } = await fetchTreasury(reward);
  const permitted = BigNumber.from(reward.amount);

  const isSolvent = balance.gte(permitted);
  const isAllowed = allowance.gte(permitted);

  if (!isSolvent) {
    toaster.create("error", `Not enough funds on funding wallet to collect this reward. Please let the financier know.`);

    return false;
  }
  if (!isAllowed) {
    toaster.create("error", `Not enough allowance on the funding wallet to collect this reward. Please let the financier know.`);

    return false;
  }

  let user: string | undefined;
  try {
    const address = await app.signer?.getAddress();
    user = address?.toLowerCase();
  } catch (error: unknown) {
    console.error("Error in signer.getAddress: ", error);
    return false;
  }

  const beneficiary = reward.beneficiary.toLowerCase();
  if (beneficiary !== user) {
    toaster.create("warning", `This reward is not for you.`);

    return false;
  }

  return true;
}

//mimics https://github.com/Uniswap/permit2/blob/a7cd186948b44f9096a35035226d7d70b9e24eaf/src/SignatureTransfer.sol#L150
export async function isNonceClaimed(app: AppState): Promise<boolean> {
  const provider = app.provider;

  const permit2Contract = new ethers.Contract(permit2Address, permit2Abi, provider);

  const { wordPos, bitPos } = nonceBitmap(BigNumber.from(app.reward.nonce));

  const bitmap = await permit2Contract.nonceBitmap(app.reward.owner, wordPos).catch((error: MetaMaskError) => {
    console.error("Error in nonceBitmap method: ", error);
    throw error;
  });

  const bit = BigNumber.from(1).shl(bitPos);
  const flipped = BigNumber.from(bitmap).xor(bit);

  return bit.and(flipped).eq(0);
}

// mimics https://github.com/Uniswap/permit2/blob/db96e06278b78123970183d28f502217bef156f4/src/SignatureTransfer.sol#L142
function nonceBitmap(nonce: BigNumberish): { wordPos: BigNumber; bitPos: number } {
  // wordPos is the first 248 bits of the nonce
  const wordPos = BigNumber.from(nonce).shr(8);
  // bitPos is the last 8 bits of the nonce
  const bitPos = BigNumber.from(nonce).and(255).toNumber();
  return { wordPos, bitPos };
}
