import Setting from '../models/Setting.js'

// @desc    Get studio settings (offer code, percentage, marquee)
// @route   GET /api/settings
// @access  Public
export const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne({ key: 'main_studio_settings' })
    if (!settings) {
      settings = await Setting.create({
        key: 'main_studio_settings',
        offerCode: 'LILY10',
        discountPercent: 10,
        offerTitle: '10% OFF Studio Discount',
        isOfferActive: true,
        marqueeText: 'EVERY PIECE HANDMADE TO ORDER • FREE SHIPPING ON ALL ORDERS • CUSTOM BESPOKE ORDERS OPEN',
      })
    }
    res.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({ message: 'Server error fetching settings' })
  }
}

// @desc    Update studio settings (offer code, discount percentage, marquee)
// @route   POST /api/settings
// @access  Admin/Public
export const updateSettings = async (req, res) => {
  try {
    const { offerCode, discountPercent, offerTitle, isOfferActive, marqueeText } = req.body

    let settings = await Setting.findOne({ key: 'main_studio_settings' })
    if (!settings) {
      settings = new Setting({ key: 'main_studio_settings' })
    }

    if (offerCode !== undefined) settings.offerCode = offerCode.toUpperCase().trim()
    if (discountPercent !== undefined) settings.discountPercent = Number(discountPercent)
    if (offerTitle !== undefined) settings.offerTitle = offerTitle
    if (isOfferActive !== undefined) settings.isOfferActive = Boolean(isOfferActive)
    if (marqueeText !== undefined) settings.marqueeText = marqueeText

    await settings.save()
    res.json({ message: 'Settings updated successfully', settings })
  } catch (error) {
    console.error('Error updating settings:', error)
    res.status(500).json({ message: 'Server error updating settings' })
  }
}
