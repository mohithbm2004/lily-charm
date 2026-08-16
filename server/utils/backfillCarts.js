import Cart from '../models/Cart.js'
import User from '../models/User.js'

/**
 * Automatically backfill existing MongoDB Cart documents with owner details and cart monetary value
 */
export async function backfillExistingCarts() {
  try {
    const carts = await Cart.find({})
    let updatedCount = 0

    for (const cart of carts) {
      let changed = false

      if (!cart.ownerName || !cart.ownerEmail || cart.cartValue === undefined || cart.totalItems === undefined) {
        if (cart.user) {
          const user = await User.findById(cart.user).lean()
          if (user) {
            cart.ownerName = user.name || 'Customer'
            cart.ownerEmail = user.email || ''
            cart.ownerPhone = user.phone || ''
            changed = true
          }
        }

        const items = Array.isArray(cart.items) ? cart.items : []
        cart.cartValue = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0)
        cart.totalItems = items.reduce((sum, i) => sum + (Number(i.qty) || 1), 0)
        cart.itemCount = items.length
        changed = true
      }

      if (changed) {
        await cart.save()
        updatedCount++
        console.log(`[BACKFILL CART]: Updated cart for ${cart.ownerName || 'Unknown'} (${cart.ownerEmail || 'No email'}) - Value: ₹${cart.cartValue}, Items: ${cart.totalItems}`)
      }
    }

    if (updatedCount > 0) {
      console.log(`[BACKFILL CART]: Successfully updated ${updatedCount} cart(s) in MongoDB`)
    }
  } catch (err) {
    console.warn('[BACKFILL CART NOTICE]:', err.message || err)
  }
}
