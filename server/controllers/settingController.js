import Setting from '../models/Setting.js'
import { emitSettingsUpdated } from '../socket.js'

// @desc    Get studio settings (marquee, shipping)
// @route   GET /api/settings
// @access  Public
export const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne({ key: 'main_studio_settings' })
    if (!settings) {
      settings = await Setting.create({
        key: 'main_studio_settings',
        marqueeText: 'EVERY PIECE HANDMADE TO ORDER • FREE SHIPPING ON ALL ORDERS ABOVE ₹2500 • CUSTOM BESPOKE ORDERS OPEN',
        shippingFeeEnabled: true,
        standardShippingFee: 100,
        freeShippingThreshold: 2500,
      })
    }
    res.json({
      success: true,
      shippingFeeEnabled: Boolean(settings.shippingFeeEnabled),
      standardShippingFee: Number(settings.standardShippingFee) || 100,
      freeShippingThreshold: Number(settings.freeShippingThreshold) || 2000,
      marqueeText: settings.marqueeText || '',
      updatedAt: settings.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({ success: false, message: 'Server error fetching settings' })
  }
}

// @desc    Update studio settings (marquee, shipping)
// @route   POST /api/settings
// @access  Admin/Public
export const updateSettings = async (req, res) => {
  try {
    const {
      marqueeText,
      shippingFeeEnabled,
      standardShippingFee,
      freeShippingThreshold,
    } = req.body

    let settings = await Setting.findOne({ key: 'main_studio_settings' })
    if (!settings) {
      settings = new Setting({ key: 'main_studio_settings' })
    }

    if (marqueeText !== undefined) settings.marqueeText = marqueeText

    if (shippingFeeEnabled !== undefined) settings.shippingFeeEnabled = Boolean(shippingFeeEnabled)
    if (standardShippingFee !== undefined) settings.standardShippingFee = Math.max(0, Number(standardShippingFee))
    if (freeShippingThreshold !== undefined) settings.freeShippingThreshold = Math.max(0, Number(freeShippingThreshold))

    await settings.save()

    const payload = {
      success: true,
      shippingFeeEnabled: Boolean(settings.shippingFeeEnabled),
      standardShippingFee: Number(settings.standardShippingFee) || 100,
      freeShippingThreshold: Number(settings.freeShippingThreshold) || 2000,
      marqueeText: settings.marqueeText || '',
      updatedAt: settings.updatedAt,
    }

    emitSettingsUpdated(payload)
    res.json({ message: 'Settings updated successfully', settings: payload })
  } catch (error) {
    console.error('Error updating settings:', error)
    res.status(500).json({ success: false, message: 'Server error updating settings' })
  }
}
