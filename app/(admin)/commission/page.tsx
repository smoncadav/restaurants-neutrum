import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CommissionForm } from '@/components/forms/CommissionForm'

export default async function CommissionPage() {
  const supabase = await createClient()

  const { data: configs } = await supabase
    .from('commission_config')
    .select('*')
    .order('effective_from', { ascending: false })
    .limit(10)

  const active = configs?.[0]

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Comisión</h1>
        <p className="text-gray-600 mt-1">Configura la comisión que cobra la plataforma</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Comisión activa</CardTitle>
          <CardDescription>Se aplica a todos los nuevos pedidos</CardDescription>
        </CardHeader>
        <CardContent>
          {active ? (
            <p className="text-3xl font-bold">
              {active.type === 'percentage' ? `${active.value}%` : `$${active.value} flat`}
            </p>
          ) : (
            <p className="text-gray-500">Sin configuración activa</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actualizar comisión</CardTitle>
          <CardDescription>
            Los cambios aplican a pedidos futuros. No afectan pedidos existentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommissionForm current={active ?? null} />
        </CardContent>
      </Card>

      {/* Historial */}
      {configs && configs.length > 1 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Historial</h2>
          <div className="space-y-2">
            {configs.slice(1).map((c) => (
              <div key={c.id} className="flex justify-between text-sm text-gray-600 bg-white p-3 rounded border">
                <span>{c.type === 'percentage' ? `${c.value}%` : `$${c.value} flat`}</span>
                <span>{new Date(c.effective_from).toLocaleDateString('es-MX')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
