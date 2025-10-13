import type { Client, FetchAPI } from "openapi-fetch";
import type { paths } from "../types";

declare interface InternalOptions {
  baseUrl?: string;
  fetch?: FetchAPI;
}

export interface SdkClientOptions extends InternalOptions {}

export type BlueprintSdkClient = Client<paths>;

export declare function createSdkClient(options?: SdkClientOptions): BlueprintSdkClient;

export default createSdkClient;

export type { paths } from "../types";
