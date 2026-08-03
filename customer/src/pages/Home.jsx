import Hero from '../sections/Hero'
import FeaturedCategories from '../sections/FeaturedCategories'
import WideBanner from '../sections/WideBanner'
import AboutArtist from '../sections/AboutArtist'
import BestSellers from '../sections/BestSellers'
import Process from '../sections/Process'
import Reviews from '../sections/Reviews'
import Newsletter from '../sections/Newsletter'

export default function Home() {
  return (
    <div className="space-y-4">
      <Hero />
      <FeaturedCategories />
      <WideBanner />
      <AboutArtist />
      <BestSellers />
      <Process />
      <Reviews />
      <Newsletter />
    </div>
  )
}

