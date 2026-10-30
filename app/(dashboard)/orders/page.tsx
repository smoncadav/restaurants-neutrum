import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { OrderStatus } from '@/types/database'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_VARIANTS: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending:   'outline',
  confirmed: 'default',
  preparing: 'secondary',
  delivered: 'default',
  cancelled: 'destructive',
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, currency')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/register')

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, external_customer_ref, quantity, total_amount, commission_amount,
      status, payment_provider, created_at,
      menus (name)
    `)
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const totalRevenue = orders
    ?.filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_amount - o.commission_amount), 0) ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-gray-600 mt-1">
          Ingresos netos (entregados):{' '}
          <strong>
            {restaurant.currency} {totalRevenue.toFixed(2)}
          </strong>
        </p>
      </div>

      {!orders?.length ? (
        <p className="text-center py-16 text-gray-500">Aún no tienes pedidos</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Meal Kit</TableHead>
              <TableHead>Cant.</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">
                  {order.id.slice(0, 8)}...
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {order.external_customer_ref}
                </TableCell>
                <TableCell>
                  {(order.menus as { name: string } | null)?.name ?? '—'}
                </TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>
                  {restaurant.currency} {order.total_amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {order.payment_provider}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[order.status as OrderStatus]}>
                    {STATUS_LABELS[order.status as OrderStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('es-MX')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
