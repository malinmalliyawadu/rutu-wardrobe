import assert from 'node:assert/strict'
import { test } from 'node:test'

import { productImageAt } from '../src/lib/product-image.ts'

test('a Shopify or Uniqlo photo is asked for at a width', () => {
  assert.equal(productImageAt('https://cdn.shopify.com/a.jpg?v=12', 768), 'https://cdn.shopify.com/a.jpg?v=12&width=768')
  assert.equal(productImageAt('//cdn.shopify.com/a.jpg', 160), 'https://cdn.shopify.com/a.jpg?width=160')
  assert.equal(productImageAt('https://shop.test/cdn/shop/files/a.jpg', 800), 'https://shop.test/cdn/shop/files/a.jpg?width=800')
  assert.equal(
    productImageAt('https://image.uniqlo.com/UQ/ST3/au/imagesgoods/475296/item/augoods_09_475296_3x4.jpg', 640),
    'https://image.uniqlo.com/UQ/ST3/au/imagesgoods/475296/item/augoods_09_475296_3x4.jpg?width=640',
  )
})

test('a find added by hand is ours, and a host that resizes on nothing is left alone', () => {
  assert.equal(productImageAt('/photos/finds/12', 640), '/photos/finds/12?w=640')
  assert.equal(productImageAt('https://images.example.com/a.jpg', 640), 'https://images.example.com/a.jpg')
})
