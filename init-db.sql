-- Create product_groups table
CREATE TABLE IF NOT EXISTS product_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    image_url TEXT,
    product_count INTEGER DEFAULT 0,
    condition_type VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    group_id INTEGER REFERENCES product_groups(id),
    sku VARCHAR(100),
    price DECIMAL(10, 2),
    final_price DECIMAL(10, 2),
    discount INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 0,
    weight DECIMAL(8, 3),
    weight_unit VARCHAR(10) DEFAULT 'g',
    height DECIMAL(6, 2),
    width DECIMAL(6, 2),
    length DECIMAL(6, 2),
    images TEXT[], -- Array of image URLs
    video_url TEXT,
    content_file TEXT, -- PDF URL
    pdf_name VARCHAR(255),
    brand VARCHAR(255),
    origin VARCHAR(255),
    material VARCHAR(255),
    barcode VARCHAR(100),
    gtin VARCHAR(100),
    cod_enabled BOOLEAN DEFAULT TRUE,
    -- J&T Shipping fields
    jt_fee_default DECIMAL(10, 2),
    is_calculating_fee BOOLEAN DEFAULT FALSE,
    fee_error TEXT,
    shipping_method VARCHAR(20) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- admin or user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_group_id ON products(group_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_product_groups_slug ON product_groups(slug);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert some sample data (optional)
INSERT INTO product_groups (name, slug, description, is_active, sort_order) VALUES
('Áo thun', 'ao-thun', 'Áo thun cotton chất lượng cao', true, 1),
('Quần jeans', 'quan-jeans', 'Quần jeans bền đẹp, thời trang', true, 2),
('Giày dép', 'giay-dep', 'Giày dép đa dạng样式', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Sample products
INSERT INTO products (name, slug, description, is_active, group_id, sku, price, final_price, discount, stock, images, brand) VALUES
('ÁO THUN TRON COTTON 180G', 'ao-thun-tron-cotton-180g', 'Áo thun tròn cotton 180g, thấm hút tốt, thoáng mát', true, 1, 'AT001', 180000, 180000, 0, 50, ARRAY['https://example.com/image1.jpg'], 'Techtra'),
('QUẦN JEANS NỮ THỪNG ĐỨNG', 'quan-jeans-nu-thung-dung', 'Quần jeans nữ thể hiện kiểu dáng hiện đại, thoải mái khi di chuyển', true, 2, 'QJ002', 450000, 405000, 10, 30, ARRAY['https://example.com/image2.jpg'], 'Techtra')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample users (passwords are hashed with bcrypt; plain passwords shown in comments)
-- admin / admin123
-- user / user123
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@techtra.vn', '$2b$10$8KZk9Y6Vj5XkZb0Jg0Z3eOeF7fG1VvK0cV2f6cU4Jz3Y6eU0a6K2W', 'admin'),
('user', 'user@techtra.vn', '$2b$10$8KZk9Y6Vj5XkZb0Jg0Z3eOeF7fG1VvK0cV2f6cU4Jz3Y6eU0a6K2W', 'user')
ON CONFLICT (username) DO NOTHING;