-- ============================================================================
-- AURELIUS AI AUCTIONEER - SUPABASE DATABASE SCHEMA
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- 1. Create LOTS Table
CREATE TABLE IF NOT EXISTS public.lots (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    provenance TEXT,
    image TEXT,
    current_bid NUMERIC NOT NULL DEFAULT 0,
    increment NUMERIC NOT NULL DEFAULT 1000,
    estimate_min NUMERIC NOT NULL,
    estimate_max NUMERIC NOT NULL,
    reserve_met BOOLEAN DEFAULT true,
    high_bidder_name TEXT,
    high_bidder_paddle TEXT,
    is_user_winner BOOLEAN DEFAULT false,
    bids_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'sold')),
    specs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create BIDS Table (Historical Audit Trail)
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lot_id TEXT REFERENCES public.lots(id) ON DELETE CASCADE,
    bidder_name TEXT NOT NULL,
    paddle TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    is_user BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create CHAT_MESSAGES Table (Conversations with Aurelius)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lot_id TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    persona TEXT DEFAULT 'auctioneer',
    extra_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create USER_PROFILES Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    paddle TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Sasikumar',
    balance NUMERIC NOT NULL DEFAULT 250000,
    won_lots JSONB DEFAULT '[]'::jsonb,
    auto_bid_max NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) & Allow Anonymous Read/Write for demo/dev
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public access for anon client keys
CREATE POLICY "Allow public read-write on lots" ON public.lots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on bids" ON public.bids FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime publication for live multiplayer bidding updates!
ALTER PUBLICATION supabase_realtime ADD TABLE public.lots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Insert Seed Catalog Lots
INSERT INTO public.lots (id, title, category, provenance, image, current_bid, increment, estimate_min, estimate_max, reserve_met, high_bidder_name, high_bidder_paddle, bids_count, status, specs)
VALUES 
('101', '1968 Patek Philippe Celestial Tourbillon Chronograph', 'HOROLOGY & TIMEPIECES', 'Geneva Private Collection • 18K Rose Gold • Obsidian Dial • Mint Condition', 'assets/img/watch.jpg', 52000, 3000, 45000, 65000, true, 'Elena Rostova (Monaco)', '#12', 18, 'active', '{"condition": "Mint Pristine (9.9/10)", "authenticity": "Geneva Seal Certified #88201", "movement": "Calibre CH 29-535 PS Q Manual-Wind", "historicalTrend": "+28.4% 3-Year Appreciation"}'::jsonb),
('102', 'The Imperial Muzo Emerald & Diamond Heritage Pendant', 'FINE JEWELRY & GEMSTONES', 'Bogotá Royal Vault • 42.6 Carat Colombian Emerald • D-Flawless Diamonds', 'assets/img/emerald.jpg', 110000, 5000, 100000, 140000, true, 'Lord Harrington (Geneva)', '#04', 24, 'upcoming', '{"condition": "Museum Grade Flawless Setting", "authenticity": "Dual Gübelin & SSEF Gemological Dossier", "caratWeight": "42.60 Carat Center Octagonal Step-Cut", "historicalTrend": "+41.2% 5-Year High Jewelry Index"}'::jsonb),
('103', 'Apex Chiron Aerodynamic Titanium Hypercar (1:8 Masterpiece)', 'CONCEPT MOTORING & COLLECTIBLES', 'Maranello Design Studio • Hand-Milled Grade 5 Titanium • Cyan LED Illumination', 'assets/img/hypercar.jpg', 85000, 5000, 80000, 120000, true, 'Kaito Tanaka (Tokyo)', '#89', 14, 'upcoming', '{"condition": "1 of 1 Titanium Studio Prototype", "authenticity": "Numbered Titanium Plaque & NFC Tag", "dimensions": "58cm x 26cm x 15cm (1:8 Scale)", "historicalTrend": "+35.0% Collector Prototype Index"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert Default User Profile
INSERT INTO public.user_profiles (paddle, name, balance)
VALUES ('#77', 'Sasikumar', 250000)
ON CONFLICT (paddle) DO NOTHING;
