import Hero from '../sections/Hero'
import BrandIntro from '../sections/BrandIntro'
import FeaturedCategories from '../sections/FeaturedCategories'
import WideBanner from '../sections/WideBanner'
import AboutArtist from '../sections/AboutArtist'
import BestSellers from '../sections/BestSellers'
import Process from '../sections/Process'
import FAQSection from '../sections/FAQSection'
import Reviews from '../sections/Reviews'
import Newsletter from '../sections/Newsletter'

export default function Home() {
  return (
    <div className="space-y-4">
      <Hero />
      <BrandIntro />
      <FeaturedCategories />
      <WideBanner />
      <AboutArtist />
      <BestSellers />
      <Process />
      <FAQSection />
      <Reviews />
      <Newsletter />
    </div>
  )
}

