import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RestaurantCardProps {
  restaurant: {
    id: string
    name: string
    description: string | null
    logo_url: string | null
    country_code: string
    currency: string
    distance_km?: number
  }
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-32 bg-gray-100">
        {restaurant.logo_url ? (
          <Image
            src={restaurant.logo_url}
            alt={restaurant.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
            🍽️
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg">{restaurant.name}</h3>
          <Badge variant="outline" className="text-xs ml-2 shrink-0">
            {restaurant.country_code}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {restaurant.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{restaurant.description}</p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{restaurant.currency}</span>
          {restaurant.distance_km !== undefined && (
            <span>{restaurant.distance_km.toFixed(1)} km</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
