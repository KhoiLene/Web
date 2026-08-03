-- =============================================================
-- db_schema_extensions.sql
-- Áp dụng schema mở rộng cho orders + transactions +
-- tạo bảng notification_log + webhook_events.
-- Idempotent — chạy nhiều lần OK.
-- =============================================================

-- 1) Orders: thêm cột cho flow CK + giao hàng + notify tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS awaiting_payment_since TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_at  TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference     VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at            TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at          TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notify_email_status   VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notify_zalo_status    VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notify_last_error     TEXT;

COMMENT ON COLUMN orders.status IS
  'pending/confirmed/awaiting_pickup/shipping/done/delivered/cancelled/awaiting_payment/payment_confirmed';

CREATE INDEX IF NOT EXISTS idx_orders_awaiting_payment
  ON orders(status, awaiting_payment_since)
  WHERE status = 'awaiting_payment';

-- 2) Transactions: mở rộng cho auto-verify CK
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status    VARCHAR(20) DEFAULT 'success';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_ref  VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS content   VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_at   TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_transactions_order_status
  ON transactions(order_id, status);

-- 3) Bảng notification_log: audit mỗi lần gửi email/zalo
CREATE TABLE IF NOT EXISTS notification_log (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  channel       VARCHAR(20)  NOT NULL,             -- 'email' | 'zalo'
  template      VARCHAR(50)  NOT NULL,             -- 'order_created' | 'order_confirmed' | ...
  recipient     VARCHAR(255) NOT NULL,
  status        VARCHAR(20)  DEFAULT 'pending',    -- pending/sent/failed
  error_message TEXT,
  payload       JSONB,
  created_at    TIMESTAMP    DEFAULT NOW(),
  sent_at       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_log_order
  ON notification_log(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_failed_retry
  ON notification_log(status, created_at) WHERE status = 'failed';

-- 4) Bảng webhook_events: log IPN VNPay + polling ngân hàng (idempotent retry)
CREATE TABLE IF NOT EXISTS webhook_events (
  id            SERIAL PRIMARY KEY,
  source        VARCHAR(30) NOT NULL,              -- 'vnpay' | 'sepay' | ...
  event_id      VARCHAR(100),
  order_id      INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  raw_payload   JSONB,
  processed     BOOLEAN DEFAULT FALSE,
  received_at   TIMESTAMP DEFAULT NOW(),
  processed_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_source
  ON webhook_events(source, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
  ON webhook_events(processed) WHERE processed = FALSE;

-- Verify
SELECT 'orders columns' AS check_, count(*) FROM information_schema.columns
 WHERE table_name='orders' AND column_name IN
   ('awaiting_payment_since','payment_confirmed_at','payment_reference',
    'shipped_at','delivered_at','notify_email_status','notify_zalo_status');
