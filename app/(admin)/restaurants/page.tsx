import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ApproveRestaurantButton } from '@/components/restaurant/ApproveRestaurantButton'

export default async function AdminRestaurantsPage() {
  const supabase = await createClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, country_code, currency, payment_provider, status, created_at')
    .order('created_at', { ascending: false })

  const pendingCount = restaurants?.filter((r) => r.status === 'pending').length ?? 0

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Restaurantes</h1>
          <p className="text-gray-600 mt-1">
            {pendingCount > 0 && (
              <span className="text-yellow-700 font-medium">{pendingCount} pendiente(s) de aprobación</span>
            )}
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>País</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Gateway</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Registro</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(restaurants ?? []).map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.country_code}</TableCell>
              <TableCell>{r.currency}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{r.payment_provider}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    r.status === 'active' ? 'default'
                    : r.status === 'pending' ? 'outline'
                    : 'destructive'
                  }
                >
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {new Date(r.created_at).toLocaleDateString('es-MX')}
              </TableCell>
              <TableCell>
                <ApproveRestaurantButton
                  restaurantId={r.id}
                  currentStatus={r.status}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
