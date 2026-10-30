import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

interface MenuCardProps {
  menu: {
    id: string
    name: string
    description: string | null
    price: number
    images: string[]
    status: string
    purchase_type: string
    serves_people: number | null
    prep_time_minutes: number | null
    health_goals: string[]
  }
  currency?: string
  showActions?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  draft: 'bg-yellow-100 text-yellow-800',
}

export function MenuCard({ menu, currency = '', showActions = false }: MenuCardProps) {
  const coverImage = menu.images[0]

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Imagen */}
      <div className="relative h-48 bg-gray-100">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={menu.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-4xl">🍱</span>
          </div>
        )}
        <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[menu.status] ?? ''}`}>
          {menu.status}
        </span>
      </div>

      <CardHeader className="pb-2">
        <h3 className="font-semibold text-lg leading-tight">{menu.name}</h3>
        {menu.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{menu.description}</p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Precio */}
        <p className="text-2xl font-bold">
          {currency && <span className="text-sm font-normal text-gray-500 mr-1">{currency}</span>}
          {menu.price.toFixed(2)}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {menu.serves_people && (
            <span>👥 {menu.serves_people} pers.</span>
          )}
          {menu.prep_time_minutes && (
            <span>⏱ {menu.prep_time_minutes} min</span>
          )}
          <Badge variant="outline" className="text-xs">
            {menu.purchase_type === 'both' ? 'Único + suscripción'
              : menu.purchase_type === 'subscription' ? 'Solo suscripción'
              : 'Compra única'}
          </Badge>
        </div>

        {/* Health goals */}
        {menu.health_goals.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {menu.health_goals.slice(0, 3).map((g) => (
              <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
            ))}
            {menu.health_goals.length > 3 && (
              <Badge variant="secondary" className="text-xs">+{menu.health_goals.length - 3}</Badge>
            )}
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="gap-2 pt-0">
          <Link href={`/dashboard/menus/${menu.id}/edit`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">Editar</Button>
          </Link>
          <Link href={`/dashboard/menus/${menu.id}/nutrition`} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full">Nutrición</Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  )
}
