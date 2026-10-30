'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const COUNTRIES = [
  { code: 'MX', label: 'México', currency: 'MXN' },
  { code: 'CO', label: 'Colombia', currency: 'COP' },
  { code: 'AR', label: 'Argentina', currency: 'ARS' },
  { code: 'CL', label: 'Chile', currency: 'CLP' },
  { code: 'BR', label: 'Brasil', currency: 'BRL' },
  { code: 'PE', label: 'Perú', currency: 'PEN' },
  { code: 'UY', label: 'Uruguay', currency: 'UYU' },
]

// Stripe disponible en: MX, CL, BR, PE, UY — resto usa MercadoPago
const STRIPE_COUNTRIES = new Set(['MX', 'CL', 'BR', 'PE', 'UY'])

const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  restaurant_name: z.string().min(2, 'Mínimo 2 caracteres'),
  country_code: z.string().min(2),
})

type RegisterValues = z.infer<typeof RegisterSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string>('')

  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { email: '', password: '', restaurant_name: '', country_code: '' },
  })

  async function onSubmit(values: RegisterValues) {
    setLoading(true)
    setError(null)

    const country = COUNTRIES.find((c) => c.code === values.country_code)!
    const paymentProvider = STRIPE_COUNTRIES.has(values.country_code) ? 'stripe' : 'mercadopago'

    const supabase = createClient()

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { role: 'restaurant_owner' },
      },
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Error al crear cuenta')
      setLoading(false)
      return
    }

    // 2. Crear registro de restaurante
    const { error: restaurantError } = await supabase.from('restaurants').insert({
      owner_id: authData.user.id,
      name: values.restaurant_name,
      country_code: values.country_code,
      currency: country.currency,
      payment_provider: paymentProvider,
      status: 'pending',
    })

    if (restaurantError) {
      setError(restaurantError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/settings?onboarding=true')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Registrar restaurante</CardTitle>
          <CardDescription>Crea tu cuenta y comienza a vender meal kits</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" {...form.register('password')} />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="restaurant_name">Nombre del restaurante</Label>
              <Input id="restaurant_name" {...form.register('restaurant_name')} />
              {form.formState.errors.restaurant_name && (
                <p className="text-sm text-red-500">{form.formState.errors.restaurant_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>País</Label>
              <Select
                onValueChange={(val: string | null) => {
                  if (!val) return
                  form.setValue('country_code', val)
                  setSelectedCountry(val)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCountry && (
                <p className="text-xs text-gray-500">
                  Gateway de pago:{' '}
                  <strong>{STRIPE_COUNTRIES.has(selectedCountry) ? 'Stripe Connect' : 'MercadoPago Marketplace'}</strong>
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-center text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Ingresar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
