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
    "gid://shopify/ProductVariant/64817081418077",
    "gid://shopify/ProductVariant/64659950371165",
    "gid://shopify/ProductVariant/64659950403933",
    "gid://shopify/ProductVariant/64659950436701",
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

  const giftGroups = [
    {
      ids: FREE_GIFT_IDS.socks,
      tier: TIERS.socks,
    },
    {
      ids: FREE_GIFT_IDS.thong,
      tier: TIERS.thong,
    },
    {
      ids: FREE_GIFT_IDS.shorts,
      tier: TIERS.shorts,
    },
  ];

  for (const group of giftGroups) {
    if (nonGiftSubtotal < group.tier) continue;

    const matchingGiftLines = input.cart.lines.filter((line) => {
      if (line.merchandise.__typename !== "ProductVariant") return false;

      return group.ids.includes(line.merchandise.id);
    });

    // If there is more than one gift from the same group,
    // do not apply our app discount to avoid stacking with Moonbundle.
    if (matchingGiftLines.length !== 1) continue;

    const giftLine = matchingGiftLines[0];

    candidates.push({
      message: "Free gift",
      targets: [
        {
          cartLine: {
            id: giftLine.id,
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