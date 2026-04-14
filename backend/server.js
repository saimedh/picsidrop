require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('./generated/prisma');

// ─── Prisma + libSQL/SQLite setup (Prisma 7 WASM engine) ──────
const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';

// libsql expects file URLs as  file:path/to/db
const libsqlUrl = dbUrl.startsWith('file:') ? dbUrl : `file:${dbUrl}`;
const libsql   = createClient({ url: libsqlUrl });
const adapter  = new PrismaLibSql(libsql);
const prisma   = new PrismaClient({ adapter });

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Endpoints ─────────────────────────────────────────────

// 1. Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Picsi Drop Backend is running.' });
});

// 2. Contact Form  →  contact_submissions
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ status: 'error', message: 'All fields are required.' });
    }

    try {
        const row = await prisma.contactSubmission.create({ data: { name, email, message } });
        console.log('[Contact saved] id:', row.id);
        res.status(200).json({
            status: 'success',
            message: `Thank you for reaching out, ${name}! We will get back to you shortly at ${email}.`
        });
    } catch (err) {
        console.error('[Contact DB Error]:', err.message);
        res.status(500).json({ status: 'error', message: 'Failed to save your message. Please try again.' });
    }
});

// 3. Newsletter  →  newsletter_subscribers (upsert)
app.post('/api/newsletter', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ status: 'error', message: 'Email address is required.' });
    }

    try {
        await prisma.newsletterSubscriber.upsert({
            where:  { email },
            update: { isActive: true },
            create: { email }
        });
        console.log('[Newsletter] subscribed:', email);
        res.status(200).json({ status: 'success', message: 'Successfully subscribed to the Picsi Drop newsletter!' });
    } catch (err) {
        console.error('[Newsletter DB Error]:', err.message);
        res.status(500).json({ status: 'error', message: 'Failed to subscribe. Please try again.' });
    }
});

// 4. Partnership Inquiry  →  partnership_inquiries
app.post('/api/partnerships', async (req, res) => {
    const { orgName, orgType, contactName, email, phone, partnershipType, message } = req.body;

    if (!orgName || !contactName || !email || !partnershipType || !message) {
        return res.status(400).json({
            status: 'error',
            message: 'Organisation name, contact name, email, partnership type, and message are required.'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ status: 'error', message: 'Please provide a valid email address.' });
    }

    const orgTypeMap = {
        'University / College': 'UNIVERSITY', 'SME / Local Business': 'SME',
        'Enterprise': 'ENTERPRISE', 'Logistics / Fleet': 'LOGISTICS',
        'NGO / Social Org': 'NGO', 'Tech / Startup': 'TECH', 'Other': 'OTHER',
    };
    const partnershipTypeMap = {
        'University / Campus Partner': 'UNIVERSITY_CAMPUS', 'SME Merchant Partner': 'SME_MERCHANT',
        'Enterprise Logistics Partner': 'ENTERPRISE_LOGISTICS', 'Fleet / Network Integration': 'FLEET_NETWORK',
        'NGO Social Delivery Partner': 'NGO_SOCIAL', 'API / Tech Integration Partner': 'API_TECH', 'Other': 'OTHER',
    };

    try {
        const row = await prisma.partnershipInquiry.create({
            data: {
                orgName,
                orgType:         orgTypeMap[orgType]         ?? 'OTHER',
                contactName,
                email,
                phone:           phone || null,
                partnershipType: partnershipTypeMap[partnershipType] ?? 'OTHER',
                message,
            }
        });
        console.log('[Partnership saved] id:', row.id, '| org:', orgName);
        res.status(200).json({
            status: 'success',
            message: `Thank you, ${contactName}! Your partnership inquiry from ${orgName} has been received. Our partnerships team will reach out to ${email} within 3–5 business days.`
        });
    } catch (err) {
        console.error('[Partnership DB Error]:', err.message);
        res.status(500).json({ status: 'error', message: 'Failed to submit your inquiry. Please try again.' });
    }
});

// ─── 404 Fallback ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Endpoint not found.' });
});

// ─── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Picsi Drop Server running on port ${PORT}`);
    console.log(`   DB:     ${libsqlUrl}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
});
