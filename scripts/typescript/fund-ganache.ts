// src/uusd_interaction.ts
import { ethers, BigNumber, Signer } from "ethers";
import { Provider, TransactionResponse } from "@ethersproject/providers";
import { ubiquityDollarChainAddresses } from "../../shared/constants";

// --- Configuration Constants ---
const GANACHE_RPC_URL = "http://127.0.0.1:8545";
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];
const EXPECTED_CHAIN_ID = 31337;
const UUSD_ADDRESS = ubiquityDollarChainAddresses[EXPECTED_CHAIN_ID];
const WHALE_ADDRESS = "0x9051eDa96dB419c967189F4Ac303a290F3327680";
const RECIPIENT_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// Connect to Ganache
const provider = new ethers.providers.JsonRpcProvider(GANACHE_RPC_URL);

// --- Custom Interfaces and Type Guards ---

// Fix: Interface name `ERC20Interface` to satisfy StrictPascalCase more definitively
interface Erc20Interface extends ethers.Contract {
  // Changed ERC20 to ERC20Interface
  approve(spender: string, amount: BigNumber): Promise<TransactionResponse>;
  transfer(to: string, amount: BigNumber): Promise<TransactionResponse>;
  balanceOf(account: string): Promise<BigNumber>;
  decimals(): Promise<number>;
}

// Define an interface for the expected structure of Ethers.js CALL_EXCEPTION errors
interface EthersCallExceptionError extends Error {
  code: string;
  reason?: string;
  data?: string;
}

// Type guard to check if an error is an EthersCallExceptionError
function isEthersCallExceptionError(error: unknown): error is EthersCallExceptionError {
  return error instanceof Error && (error as EthersCallExceptionError).code === ethers.utils.Logger.errors.CALL_EXCEPTION;
}

// --- Helper Functions to Reduce Cognitive Complexity ---

async function verifyNetwork(currentProvider: Provider): Promise<void> {
  try {
    const network = await currentProvider.getNetwork();
    console.log(`Connected to Network Name: ${network.name}`);
    console.log(`Connected to Chain ID: ${network.chainId}`);
    if (network.chainId !== EXPECTED_CHAIN_ID) {
      console.warn(`WARNING: Connected to unexpected Chain ID ${network.chainId}. Expected ${EXPECTED_CHAIN_ID}.`);
      // process.exit(1); // Optionally exit if chain ID mismatch is critical
    }
  } catch (error: unknown) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Failed to get network information:", errorMessage);
    process.exit(1);
  }
}

async function checkEthBalance(address: string, label: string, currentProvider: Provider): Promise<void> {
  const ethBalance = await currentProvider.getBalance(address);
  console.log(`${label}'s current ETH balance (for gas): ${ethers.utils.formatEther(ethBalance)} ETH`);
  if (ethBalance.isZero()) {
    console.warn(`WARNING: ${label} account ${address} has 0 ETH! Transactions will likely fail due to insufficient gas.`);
    console.warn(`You might need to send some ETH to ${address} on your Ganache fork, or pick an account with existing ETH.`);
  }
}

async function getUusdDetails(uusdContract: Erc20Interface, whaleAddress: string, recipientAddress: string): Promise<number> {
  const decimals = await uusdContract.decimals();
  console.log(`UUSD decimals: ${decimals}`);

  const initialWhaleUusdBalance = await uusdContract.balanceOf(whaleAddress);
  console.log(`Whale's initial UUSD balance: ${ethers.utils.formatUnits(initialWhaleUusdBalance, decimals)} UUSD`);

  const initialRecipientUusdBalance = await uusdContract.balanceOf(recipientAddress);
  console.log(`Recipient's initial UUSD balance: ${ethers.utils.formatUnits(initialRecipientUusdBalance, decimals)} UUSD`);

  if (initialRecipientUusdBalance.isZero()) {
    console.warn(`WARNING: Recipient account ${recipientAddress} has 0 UUSD. It cannot approve or transfer UUSD.`);
    console.warn(`Consider transferring UUSD from ${whaleAddress} to ${recipientAddress} first if the recipient needs to send UUSD.`);
  }
  return decimals;
}

async function approveUusd(signer: Signer, uusdContract: Erc20Interface, spenderAddress: string, amount: BigNumber, fromAddress: string): Promise<void> {
  console.log(`\nApproving ${ethers.utils.formatUnits(amount, await uusdContract.decimals())} UUSD for ${spenderAddress} from ${fromAddress}...`);
  const uusdContractWithSigner = uusdContract.connect(signer) as Erc20Interface;
  try {
    const approveTx = await uusdContractWithSigner.approve(spenderAddress, amount);
    console.log(`Approval transaction hash by ${fromAddress}: ${approveTx.hash}`);
    await approveTx.wait();
    console.log(`Approval by ${fromAddress} successful!`);
  } catch (error: unknown) {
    let errorMessage = "Unknown error during approval.";
    if (isEthersCallExceptionError(error)) {
      errorMessage = error.message;
      console.error("Reason (if available):", error.reason);
      console.error("Error data (if available):", error.data);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`Approval by ${fromAddress} failed:`, errorMessage);
    process.exit(1);
  }
}

async function transferUusd(signer: Signer, uusdContract: Erc20Interface, toAddress: string, amount: BigNumber, fromAddress: string): Promise<void> {
  console.log(`\nTransferring ${ethers.utils.formatUnits(amount, await uusdContract.decimals())} UUSD from ${fromAddress} to ${toAddress}...`);
  const uusdContractWithSigner = uusdContract.connect(signer) as Erc20Interface;
  try {
    const transferTx = await uusdContractWithSigner.transfer(toAddress, amount);
    console.log(`Transfer transaction hash by ${fromAddress}: ${transferTx.hash}`);
    await transferTx.wait();
    console.log("Transfer successful!");
  } catch (error: unknown) {
    let errorMessage = "Unknown error during transfer.";
    if (isEthersCallExceptionError(error)) {
      errorMessage = error.message;
      console.error("Reason (if available):", error.reason);
      console.error("Error data (if available):", error.data);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Transfer failed:", errorMessage);
  }
}

async function main() {
  console.log("Connecting to Ganache...");

  // Verify Network
  await verifyNetwork(provider);

  console.log(`Assuming account ${WHALE_ADDRESS} is unlocked by Ganache configuration.`);

  const whaleSigner: Signer = provider.getSigner(WHALE_ADDRESS);
  const recipientSigner: Signer = provider.getSigner(RECIPIENT_WALLET);

  // Check ETH balances for gas
  await checkEthBalance(WHALE_ADDRESS, "Whale", provider);
  await checkEthBalance(RECIPIENT_WALLET, "Recipient", provider);

  // Get UUSD contract instance
  const uusdContract = new ethers.Contract(UUSD_ADDRESS, ERC20_ABI, provider) as Erc20Interface; // Using ERC20Interface

  // Get UUSD decimals and initial balances (only decimals is returned for explicit use)
  const decimals = await getUusdDetails(uusdContract, WHALE_ADDRESS, RECIPIENT_WALLET);

  // --- Approve 10000 UUSD for Permit2 from RECIPIENT_WALLET ---
  const amountToApprove = ethers.utils.parseUnits("10000", decimals);
  await approveUusd(recipientSigner, uusdContract, PERMIT2_ADDRESS, amountToApprove, RECIPIENT_WALLET);

  // --- Transfer 500 UUSD from whale to RECIPIENT_WALLET ---
  const amountToTransfer = ethers.utils.parseUnits("500", decimals);
  await transferUusd(whaleSigner, uusdContract, RECIPIENT_WALLET, amountToTransfer, WHALE_ADDRESS);

  // Get final balances
  const finalWhaleUusdBalance: BigNumber = await uusdContract.balanceOf(WHALE_ADDRESS);
  const finalRecipientUusdBalance: BigNumber = await uusdContract.balanceOf(RECIPIENT_WALLET);
  console.log(`\nWhale's final UUSD balance: ${ethers.utils.formatUnits(finalWhaleUusdBalance, decimals)} UUSD`);
  console.log(`Recipient's final UUSD balance: ${ethers.utils.formatUnits(finalRecipientUusdBalance, decimals)} UUSD`);
}

main().catch((error: unknown) => {
  let errorMessage = "An unhandled error occurred.";
  if (error instanceof Error) {
    errorMessage += `: ${error.message}`;
  }
  console.error(errorMessage);
  process.exit(1);
});
