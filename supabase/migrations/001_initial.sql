-- ============================================================
-- 001_initial.sql — Meal Kit Marketplace: Schema completo
-- ============================================================

-- --------------------------------------------------------
-- Extensiones
-- --------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- --------------------------------------------------------
-- Tipos de usuario (roles de aplicación)
-- --------------------------------------------------------
-- Los roles se manejan a través de app_metadata en Supabase Auth
-- Valores posibles: restaurant_owner | nutritionist | platform_admin

-- --------------------------------------------------------
-- Tabla: restaurants
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurants (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  logo_url        text,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'suspended')),
  country_code    text NOT NULL,   -- MX | CO | AR | CL | BR | PE | UY
  currency        text NOT NULL,   -- MXN | COP | ARS | CLP | BRL | PEN | UYU
  payment_provider text NOT NULL
                    CHECK (payment_provider IN ('stripe', 'mercadopago')),
  stripe_account_id  text,         -- solo si payment_provider = 'stripe'
  mp_user_id         text,         -- MercadoPago user id (OAuth)
  -- mp_access_token guardado en Supabase Vault / env cifrada, NO aquí
  location        geography(POINT, 4326),
  radius_km       numeric DEFAULT 10,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_restaurants_owner    ON restaurants(owner_id);
CREATE INDEX idx_restaurants_status   ON restaurants(status);
CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location);

-- --------------------------------------------------------
-- Tabla: menus (Meal Kits)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS menus (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id       uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  price               numeric NOT NULL CHECK (price >= 0),
  images              text[] DEFAULT '{}',
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('active', 'inactive', 'draft')),
  purchase_type       text NOT NULL DEFAULT 'both'
                        CHECK (purchase_type IN ('one_time', 'subscription', 'both')),
  serves_people       int DEFAULT 1 CHECK (serves_people > 0),
  prep_time_minutes   int DEFAULT 30 CHECK (prep_time_minutes > 0),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menus_restaurant ON menus(restaurant_id);
CREATE INDEX idx_menus_status     ON menus(status);

-- --------------------------------------------------------
-- Tabla: menu_health_goals
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_health_goals (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id   uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  goal      text NOT NULL
              CHECK (goal IN (
                'weight_loss', 'muscle_gain', 'maintenance',
                'energy', 'detox', 'heart_health', 'diabetes_friendly',
                'vegan', 'vegetarian', 'gluten_free', 'keto', 'paleo'
              )),
  UNIQUE(menu_id, goal)
);

CREATE INDEX idx_menu_health_goals_menu ON menu_health_goals(menu_id);
CREATE INDEX idx_menu_health_goals_goal ON menu_health_goals(goal);

-- --------------------------------------------------------
-- Tabla: menu_nutrition
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_nutrition (
  menu_id              uuid PRIMARY KEY REFERENCES menus(id) ON DELETE CASCADE,
  calories_per_serving numeric CHECK (calories_per_serving >= 0),
  protein_g            numeric CHECK (protein_g >= 0),
  carbs_g              numeric CHECK (carbs_g >= 0),
  fat_g                numeric CHECK (fat_g >= 0),
  fiber_g              numeric CHECK (fiber_g >= 0),
  sugar_g              numeric CHECK (sugar_g >= 0),
  sodium_mg            numeric CHECK (sodium_mg >= 0),
  allergens            text[] DEFAULT '{}'
);

-- --------------------------------------------------------
-- Tabla: orders
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_customer_ref   text NOT NULL,
  restaurant_id           uuid NOT NULL REFERENCES restaurants(id),
  menu_id                 uuid NOT NULL REFERENCES menus(id),
  quantity                int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price              numeric NOT NULL CHECK (unit_price >= 0),
  total_amount            numeric NOT NULL CHECK (total_amount >= 0),
  commission_amount       numeric NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  currency                text NOT NULL,
  status                  text NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                              'pending', 'confirmed', 'preparing',
                              'delivered', 'cancelled'
                            )),
  payment_provider        text NOT NULL
                            CHECK (payment_provider IN ('stripe', 'mercadopago')),
  stripe_payment_intent_id text,
  mp_payment_id           text,
  mp_preference_id        text,
  delivery_address        jsonb,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- --------------------------------------------------------
-- Tabla: subscriptions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_customer_ref text NOT NULL,
  menu_id               uuid NOT NULL REFERENCES menus(id),
  frequency             text NOT NULL
                          CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'cancelled')),
  payment_provider      text NOT NULL
                          CHECK (payment_provider IN ('stripe', 'mercadopago')),
  stripe_subscription_id text,
  mp_preapproval_id     text,   -- MercadoPago Preapproval para suscripciones
  next_delivery_date    date,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_menu   ON subscriptions(menu_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- --------------------------------------------------------
-- Tabla: commission_config
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS commission_config (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type           text NOT NULL CHECK (type IN ('percentage', 'flat')),
  value          numeric NOT NULL CHECK (value >= 0),
  effective_from timestamptz NOT NULL DEFAULT now()
);

-- Comisión inicial por defecto: 10%
INSERT INTO commission_config (type, value, effective_from)
VALUES ('percentage', 10, now());

-- --------------------------------------------------------
-- Tabla: api_keys (autenticación para plataforma externa)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash    text UNIQUE NOT NULL,
  name        text NOT NULL,
  active      bool NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE restaurants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus              ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_health_goals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_nutrition     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys           ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- Helper: obtener rol del usuario autenticado
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'anon'
  )
$$;

-- --------------------------------------------------------
-- Policies: restaurants
-- --------------------------------------------------------

-- platform_admin: acceso total
CREATE POLICY "admin_all_restaurants" ON restaurants
  FOR ALL USING (auth.user_role() = 'platform_admin');

-- restaurant_owner: solo sus propios restaurantes
CREATE POLICY "owner_own_restaurants" ON restaurants
  FOR ALL USING (
    auth.user_role() = 'restaurant_owner'
    AND owner_id = auth.uid()
  );

-- API pública (service_role): lectura de restaurantes activos
CREATE POLICY "service_read_active_restaurants" ON restaurants
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR status = 'active'
  );

-- --------------------------------------------------------
-- Policies: menus
-- --------------------------------------------------------

CREATE POLICY "admin_all_menus" ON menus
  FOR ALL USING (auth.user_role() = 'platform_admin');

CREATE POLICY "owner_own_menus" ON menus
  FOR ALL USING (
    auth.user_role() = 'restaurant_owner'
    AND restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- nutritionist: solo puede actualizar menus (no crear/borrar)
CREATE POLICY "nutritionist_update_menus" ON menus
  FOR SELECT USING (auth.user_role() = 'nutritionist');

CREATE POLICY "service_read_active_menus" ON menus
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR status = 'active'
  );

-- --------------------------------------------------------
-- Policies: menu_health_goals
-- --------------------------------------------------------

CREATE POLICY "admin_all_health_goals" ON menu_health_goals
  FOR ALL USING (auth.user_role() = 'platform_admin');

CREATE POLICY "owner_health_goals" ON menu_health_goals
  FOR ALL USING (
    auth.user_role() = 'restaurant_owner'
    AND menu_id IN (
      SELECT m.id FROM menus m
      JOIN restaurants r ON r.id = m.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

CREATE POLICY "nutritionist_all_health_goals" ON menu_health_goals
  FOR ALL USING (auth.user_role() = 'nutritionist');

CREATE POLICY "service_read_health_goals" ON menu_health_goals
  FOR SELECT USING (auth.role() = 'service_role');

-- --------------------------------------------------------
-- Policies: menu_nutrition
-- --------------------------------------------------------

CREATE POLICY "admin_all_nutrition" ON menu_nutrition
  FOR ALL USING (auth.user_role() = 'platform_admin');

CREATE POLICY "nutritionist_all_nutrition" ON menu_nutrition
  FOR ALL USING (auth.user_role() = 'nutritionist');

CREATE POLICY "owner_nutrition" ON menu_nutrition
  FOR ALL USING (
    auth.user_role() = 'restaurant_owner'
    AND menu_id IN (
      SELECT m.id FROM menus m
      JOIN restaurants r ON r.id = m.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

CREATE POLICY "service_read_nutrition" ON menu_nutrition
  FOR SELECT USING (auth.role() = 'service_role');

-- --------------------------------------------------------
-- Policies: orders
-- --------------------------------------------------------

CREATE POLICY "admin_all_orders" ON orders
  FOR ALL USING (auth.user_role() = 'platform_admin');

CREATE POLICY "owner_read_orders" ON orders
  FOR SELECT USING (
    auth.user_role() = 'restaurant_owner'
    AND restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "service_all_orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- --------------------------------------------------------
-- Policies: subscriptions
-- --------------------------------------------------------

CREATE POLICY "admin_all_subscriptions" ON subscriptions
  FOR ALL USING (auth.user_role() = 'platform_admin');

CREATE POLICY "service_all_subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- --------------------------------------------------------
-- Policies: commission_config
-- --------------------------------------------------------

CREATE POLICY "admin_all_commission" ON commission_config
  FOR ALL USING (auth.user_role() = 'platform_admin');

CREATE POLICY "service_read_commission" ON commission_config
  FOR SELECT USING (auth.role() = 'service_role');

-- --------------------------------------------------------
-- Policies: api_keys
-- --------------------------------------------------------

CREATE POLICY "admin_all_api_keys" ON api_keys
  FOR ALL USING (auth.user_role() = 'platform_admin');

CREATE POLICY "service_read_api_keys" ON api_keys
  FOR SELECT USING (auth.role() = 'service_role');

-- ============================================================
-- Función auxiliar: buscar restaurantes por radio (PostGIS)
-- ============================================================
CREATE OR REPLACE FUNCTION search_restaurants_by_location(
  lat         double precision,
  lng         double precision,
  radius_km   double precision DEFAULT 10,
  health_goal text DEFAULT NULL,
  p_limit     int DEFAULT 20,
  p_offset    int DEFAULT 0
)
RETURNS TABLE (
  id              uuid,
  name            text,
  description     text,
  logo_url        text,
  country_code    text,
  currency        text,
  distance_km     double precision
) LANGUAGE sql STABLE AS $$
  SELECT DISTINCT
    r.id,
    r.name,
    r.description,
    r.logo_url,
    r.country_code,
    r.currency,
    ST_Distance(
      r.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000.0 AS distance_km
  FROM restaurants r
  LEFT JOIN menus m ON m.restaurant_id = r.id AND m.status = 'active'
  LEFT JOIN menu_health_goals mhg ON mhg.menu_id = m.id
  WHERE
    r.status = 'active'
    AND r.location IS NOT NULL
    AND ST_DWithin(
      r.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
    AND (health_goal IS NULL OR mhg.goal = health_goal)
  ORDER BY distance_km ASC
  LIMIT p_limit OFFSET p_offset;
$$;
