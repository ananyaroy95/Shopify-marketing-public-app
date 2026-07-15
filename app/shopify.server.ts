function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

import "@shopify/shopify-app-react-router/adapters/node";
import {
  storeSession,
  loadSession,
  deleteSession,
  deleteSessions,
  findSessionsByShop,
} from "./utils/dbSessionStorage.server";

import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  DeliveryMethod,
} from "@shopify/shopify-app-react-router/server";
import { saveShop } from "./utils/dbShopStorage.server";

const shopify = shopifyApp({
  // apiKey: process.env.SHOPIFY_API_KEY,
  // apiSecretKey: process.env.SHOPIFY_API_SECRET || "", 
  // apiVersion: ApiVersion.October25,
  // scopes: process.env.SCOPES?.split(","),
  // appUrl: process.env.SHOPIFY_APP_URL || "",
  // authPathPrefix: "/auth",
  apiKey: getEnv("SHOPIFY_API_KEY"),
  apiSecretKey: getEnv("SHOPIFY_API_SECRET"),
  appUrl: getEnv("SHOPIFY_APP_URL"),
  // scopes: getEnv("SCOPES").split(","),

  apiVersion: ApiVersion.October25,
  authPathPrefix: "/auth",

  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app-uninstalled",
    },
  },

  sessionStorage: {
    storeSession,
    loadSession,
    deleteSession,
    deleteSessions,
    findSessionsByShop,
  },

  hooks: {
    afterAuth: async ({ session }) => {
      const shop = session.shop;
      const accessToken = session.accessToken;

      if (!shop || !accessToken) return;
      saveShop(shop, accessToken);
    },
  },

  distribution: AppDistribution.AppStore,
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
