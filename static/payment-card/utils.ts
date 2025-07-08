import ct from "countries-and-timezones";
import { ethers } from "ethers";

declare const BACKEND_URL: string;

export function getApiBaseUrl() {
  return BACKEND_URL;
}

export const requestInit = {
  method: "GET",
  headers: {
    Accept: "application/json",
  },
};

async function getCountryCodeByIp() {
  try {
    const response = await fetch("https://ipinfo.io/json");
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const json = await response.json();
    return json.country;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getCountryCodeByTimezone() {
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const countries = ct.getCountriesForTimezone(localTimezone);
  return countries[0]?.id;
}

export async function getUserCountryCode(): Promise<string> {
  const methods = [getCountryCodeByIp, getCountryCodeByTimezone];
  for (let i = 0; i < methods.length; ++i) {
    const countryCode = await methods[i]();
    if (countryCode) {
      return countryCode;
    }
  }
  throw new Error("Failed to detect user location.");
}

export async function getConnectedWallet() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return await signer.getAddress();
  } catch (e) {
    console.error(e);
    throw new Error("Connection to your wallet failed.");
  }
}
