import { getNetworkExplorer } from "@ubiquity-dao/rpc-handler";
import { convertToNetworkId } from "./services/use-rpc-handler";
import { PermitReward } from "@ubiquibot/permit-generation";
import { ethers } from "ethers";

export class AppState {
  public claims: PermitReward[] = [];
  public claimTxs: Record<string, string> = {};
  private _provider!: ethers.providers.JsonRpcProvider;
  private _currentIndex = 0;
  private _signer: ethers.providers.JsonRpcSigner | null = null;

  get signer() {
    return this._signer;
  }

  set signer(value) {
    this._signer = value;
  }

  get networkId(): number | null {
    return this.reward?.networkId || null;
  }

  get provider(): ethers.providers.JsonRpcProvider {
    return this._provider;
  }

  set provider(value: ethers.providers.JsonRpcProvider) {
    this._provider = value;
  }

  get rewardIndex(): number {
    return this._currentIndex;
  }

  get reward(): PermitReward {
    return this.rewardIndex < this.claims.length ? this.claims[this.rewardIndex] : this.claims[0];
  }

  get permitNetworkId() {
    return this.reward?.networkId;
  }

  get currentExplorerUrl(): string {
    const networkId = convertToNetworkId(this.reward.networkId);
    if (!this.reward || !getNetworkExplorer(networkId)) {
      return "https://blockscan.com";
    }

    return getNetworkExplorer(networkId)[0].url;
  }
}

export const app = new AppState();
