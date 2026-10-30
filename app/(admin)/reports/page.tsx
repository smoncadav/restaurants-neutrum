import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function ReportsPage() {
  const supabase = await createClient()

  // Órdenes recientes
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, total_amount, commission_amount, currency, status,
      payment_provider, created_at,
      restaurants (name, country_code)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // Suscripciones activas
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, status, payment_provider, frequency')
    .eq('status', 'active')

  // Agregados
  const totalOrders = orders?.length ?? 0
  const totalRevenue = orders?.reduce((s, o) => s + o.total_amount, 0) ?? 0
  const totalCommission = orders?.reduce((s, o) => s + o.commission_amount, 0) ?? 0
  const stripeOrders = orders?.filter((o) => o.payment_provider === 'stripe').length ?? 0
  const mpOrders = orders?.filter((o) => o.payment_provider === 'mercadopago').length ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-gray-600 mt-1">Últimos 50 pedidos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Pedidos</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-bold">{totalOrders}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Ingresos brutos</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold">${totalRevenue.toFixed(0)}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Comisión plataforma</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold text-green-600">${totalCommission.toFixed(0)}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Suscripciones activas</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-bold">{subs?.length ?? 0}</span></CardContent>
        </Card>
      </div>

      {/* Por provider */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-sm">Stripe</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold">{stripeOrders}</span><span className="text-gray-500 ml-2">pedidos</span></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">MercadoPago</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold">{mpOrders}</span><span className="text-gray-500 ml-2">pedidos</span></CardContent>
        </Card>
      </div>

      {/* Tabla detalle */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Restaurante</TableHead>
            <TableHead>País</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Comisión</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(orders ?? []).map((o) => {
            const restaurant = o.restaurants as { name: string; country_code: string } | null
            return (
              <TableRow key={o.id}>
                <TableCell>{restaurant?.name ?? '—'}</TableCell>
                <TableCell>{restaurant?.country_code ?? '—'}</TableCell>
                <TableCell>{o.currency} {o.total_amount.toFixed(2)}</TableCell>
                <TableCell className="text-green-600">{o.currency} {o.commission_amount.toFixed(2)}</TableCell>
                <TableCell><Badge variant="outline">{o.payment_provider}</Badge></TableCell>
                <TableCell><Badge>{o.status}</Badge></TableCell>
                <TableCell className="text-sm text-gray-500">
                  {new Date(o.created_at).toLocaleDateString('es-MX')}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
