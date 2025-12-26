/**
 * STEP DEFINITIONS - THE TRANSLATION LAYER TAX
 *
 * This file demonstrates the fundamental problem with Gherkin-based testing:
 *
 * 1. MAINTENANCE BURDEN: Every time you change wording in the feature file,
 *    you MUST update the regex patterns here. No IDE support.
 *
 * 2. NO TYPE SAFETY: String matching instead of real types.
 *    Renaming a property in the engine doesn't propagate to step definitions.
 *
 * 3. REFRACTURING NIGHTMARE: Try renaming "bulk discount" to "volume discount" - you'll
 *    need to search and replace across both the .feature files AND these regex patterns.
 *
 * 4. DEBUGGABILITY: When a test fails, you have to trace through the translation layer.
 *    Stack traces bounce between feature files and this code.
 *
 * COMPARISON: In the Executable Specs implementation (typescript-vitest/),
 * tests are regular TypeScript code - refactor, navigate, and debug with full IDE support.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PricingEngine } from '../src/pricing-engine';
import { CartItem, User, ShippingMethod } from '../src/types';

// World object for sharing state between steps
class PricingWorld {
  cartItems: CartItem[] = [];
  user: User = { tenureYears: 0 };
  shippingMethod: ShippingMethod = ShippingMethod.STANDARD;
  result: any = null;
}

// Set up world
let world = new PricingWorld();

// Reset world before each scenario to avoid state leakage
Before(function() {
  world = new PricingWorld();
});

// ============================================================================
// GIVEN STEPS
// ============================================================================

// WARNING: If you rename 'cart with items:' in the feature file,
// you must update this regex pattern manually or tests will fail!
Given(/^I have a cart with items:$/, function(dataTable: any) {
  const items = dataTable.hashes();
  world.cartItems = items.map((item: any) => ({
    sku: item.sku,
    name: item.name,
    price: parseInt(item.price, 10),
    quantity: parseInt(item.qty, 10),
    weightInKg: parseFloat(item.weight || '1.0')
  }));
});

// PAIN POINT: Similar phrasing requires separate step definitions
// "empty cart" vs "cart with items" - could be simplified with better regex,
// but that makes code harder to read and maintain
Given(/^I have an empty cart$/, function() {
  world.cartItems = [];
});

// WARNING: If you change "VIP customer with X years tenure" wording,
// this regex breaks and tests fail
Given(/^I am a VIP customer with (\d+) years tenure$/, function(years: string) {
  world.user = { tenureYears: parseInt(years, 10) };
});

// PAIN POINT: Variations in phrasing requiring multiple patterns:
// "VIP customer", "customer with X years", "user with X years"
// Each requires a separate regex pattern
Given(/^I am a customer with (\d+) years? tenure$/, function(years: string) {
  world.user = { tenureYears: parseInt(years, 10) };
});

// WARNING: "Standard", "Expedited", "Express" must match exactly feature file wording
// No autocomplete, no typos detected until runtime
Given(/^I select (Standard|Expedited|Express) shipping$/, function(method: string) {
  // MANUAL MAPPING: This could be expressed more elegantly in pure TypeScript
  const methodMap: { [key: string]: ShippingMethod } = {
    'Standard': ShippingMethod.STANDARD,
    'Expedited': ShippingMethod.EXPEDITED,
    'Express': ShippingMethod.EXPRESS
  };
  world.shippingMethod = methodMap[method];
});

// ============================================================================
// WHEN STEPS
// ============================================================================

// PAIN POINT: Two separate step definitions for "calculate total" vs "calculate total including shipping"
// Could be parameterized, but feature file uses different wording for readability
When(/^I calculate the total$/, function() {
  world.result = PricingEngine.calculate(world.cartItems, world.user);
});

When(/^I calculate the total including shipping$/, function() {
  world.result = PricingEngine.calculate(
    world.cartItems,
    world.user,
    world.shippingMethod
  );
});

// ============================================================================
// THEN STEPS
// ============================================================================

// WARNING: This regex matches ONE specific wording. If you ever want to change
// "original total is X cents" to "original total: X cents", you must update BOTH
// the feature file AND this regex
Then(/^the original total is (\d+) cents$/, function(expected: string) {
  expect(world.result.originalTotal).to.equal(parseInt(expected, 10));
});

Then(/^the final total is (\d+) cents$/, function(expected: string) {
  expect(world.result.finalTotal).to.equal(parseInt(expected, 10));
});

Then(/^the total discount is (\d+) cents$/, function(expected: string) {
  expect(world.result.totalDiscount).to.equal(parseInt(expected, 10));
});

Then(/^the bulk discount is (\d+) cents$/, function(expected: string) {
  expect(world.result.bulkDiscountTotal).to.equal(parseInt(expected, 10));
});

Then(/^the VIP discount is (\d+) cents$/, function(expected: string) {
  expect(world.result.vipDiscount).to.equal(parseInt(expected, 10));
});

Then(/^the subtotal after bulk is (\d+) cents$/, function(expected: string) {
  expect(world.result.subtotalAfterBulk).to.equal(parseInt(expected, 10));
});

// PAIN POINT: This regex might accidentally match "discount is 0 cents" or "total discount is 0 cents"
// depending on ordering in the test runner. No IDE help with this ambiguity!
Then(/^the discount is not capped$/, function() {
  expect(world.result.isCapped).to.equal(false);
});

Then(/^the discount is capped$/, function() {
  expect(world.result.isCapped).to.equal(true);
});

// WARNING: Complex assertion that requires manual calculation
// The Executable Specs version can use real TypeScript code for this
Then(/^the total discount is capped at 30% of original$/, function() {
  const maxDiscount = Math.round(world.result.originalTotal * 0.30);
  expect(world.result.totalDiscount).to.equal(maxDiscount);
  expect(world.result.isCapped).to.equal(true);
});

Then(/^the discounted total is 70% of original$/, function() {
  const expectedFinal = Math.round(world.result.originalTotal * 0.70);
  expect(world.result.finalTotal).to.equal(expectedFinal);
});

// PAIN POINT: Shipping assertions require multiple step definitions
// Could be one step with parameters, but feature file uses different wording
Then(/^shipping is free$/, function() {
  expect(world.result.shipment.isFreeShipping).to.equal(true);
  expect(world.result.shipment.totalShipping).to.equal(0);
});

Then(/^shipping is not free$/, function() {
  expect(world.result.shipment.isFreeShipping).to.equal(false);
});

Then(/^the base shipping is (\d+) cents$/, function(expected: string) {
  expect(world.result.shipment.baseShipping).to.equal(parseInt(expected, 10));
});

Then(/^the weight surcharge is (\d+) cents$/, function(expected: string) {
  expect(world.result.shipment.weightSurcharge).to.equal(parseInt(expected, 10));
});

Then(/^the total shipping cost is (\d+) cents$/, function(expected: string) {
  expect(world.result.shipment.totalShipping).to.equal(parseInt(expected, 10));
});

Then(/^the expedited surcharge is (\d+) cents$/, function(expected: string) {
  expect(world.result.shipment.expeditedSurcharge).to.equal(parseInt(expected, 10));
});

Then(/^the total shipping cost is exactly (\d+) cents$/, function(expected: string) {
  expect(world.result.shipment.totalShipping).to.equal(parseInt(expected, 10));
});

Then(/^the total shipping includes base \+ expedited$/, function() {
  const expected = world.result.shipment.baseShipping + world.result.shipment.expeditedSurcharge;
  expect(world.result.shipment.totalShipping).to.equal(expected);
});

// PAIN POINT: Manual calculation in step definitions instead of expressive API
// In Executable Specs: expect(result.grandTotal).to.equal(result.finalTotal + result.shipment.totalShipping)
Then(/^the grand total equals final total plus shipping$/, function() {
  const expected = world.result.finalTotal + world.result.shipment.totalShipping;
  expect(world.result.grandTotal).to.equal(expected);
});

Then(/^the grand total equals the final total$/, function() {
  expect(world.result.grandTotal).to.equal(world.result.finalTotal);
});
