import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

const FREE_GIFT_IDS = {
  socks: [
    "gid://shopify/ProductVariant/64124155494749",
    "gid://shopify/ProductVariant/52540821242205",
  ],
  thong: [
    "gid://shopify/ProductVariant/62532493443421",
    "gid://shopify/ProductVariant/62532493476189",
    "gid://shopify/ProductVariant/62532493508957",
    "gid://shopify/ProductVariant/62532493541725",
  ],
  shorts: [
    "gid://shopify/ProductVariant/64659950469469",
    "gid://shopify/ProductVariant/64659950502237",
    "gid://shopify/ProductVariant/64659950535005",
  ],
};

const TIERS = {
  socks: 60,
  thong: 80,
  shorts: 110,
};

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product
  );

  if (!hasProductDiscountClass) {
    return { operations: [] };
  }

  const allGiftIds = [
    ...FREE_GIFT_IDS.socks,
    ...FREE_GIFT_IDS.thong,
    ...FREE_GIFT_IDS.shorts,
  ];

  let nonGiftSubtotal = 0;

  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;

    const variantId = line.merchandise.id;

    if (!allGiftIds.includes(variantId)) {
      nonGiftSubtotal += Number(line.cost.subtotalAmount.amount);
    }
  }

  const candidates = [];

  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;

    const variantId = line.merchandise.id;

    const isSockGift =
      FREE_GIFT_IDS.socks.includes(variantId) && nonGiftSubtotal >= TIERS.socks;

    const isThongGift =
      FREE_GIFT_IDS.thong.includes(variantId) && nonGiftSubtotal >= TIERS.thong;

    const isShortsGift =
      FREE_GIFT_IDS.shorts.includes(variantId) && nonGiftSubtotal >= TIERS.shorts;

    if (isSockGift || isThongGift || isShortsGift) {
      candidates.push({
        message: "Free gift",
        targets: [
          {
            cartLine: {
              id: line.id,
              quantity: 1,
            },
          },
        ],
        value: {
          percentage: {
            value: 100,
          },
        },
      });
    }
  }

  if (!candidates.length) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}