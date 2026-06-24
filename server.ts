import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  collection, 
  doc, 
  getDocs as fbGetDocs, 
  getDoc as fbGetDoc, 
  setDoc as fbSetDoc, 
  addDoc as fbAddDoc, 
  updateDoc as fbUpdateDoc, 
  deleteDoc as fbDeleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { trustees, technicalPartners, previousEvents, galleryItems } from './src/data/oydeiContent';
import dotenv from 'dotenv';

dotenv.config();

// Load Firebase Config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err);
  }
} else {
  console.warn('firebase-applet-config.json not found! Using environment variables.');
}

// Initialize Firebase
const firebaseApp = initializeApp({
  apiKey: firebaseConfig.apiKey || process.env.FIREBASE_API_KEY,
  authDomain: firebaseConfig.authDomain || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfig.storageBucket || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfig.messagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfig.appId || process.env.FIREBASE_APP_ID,
});

const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

// --- FIRESTORE ERROR HANDLING & WRAPPERS ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function getPathFromRef(ref: any): string {
  if (!ref) return 'unknown';
  if (typeof ref.path === 'string') return ref.path;
  if (ref.ref && typeof ref.ref.path === 'string') return ref.ref.path;
  try {
    if (ref._query && ref._query.path && ref._query.path.segments) {
      return ref._query.path.segments.join('/');
    }
  } catch (e) {}
  return 'query_collection';
}

async function getDocs(colRef: any): Promise<any> {
  try {
    return await fbGetDocs(colRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, getPathFromRef(colRef));
  }
}

async function getDoc(docRef: any): Promise<any> {
  try {
    return await fbGetDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, getPathFromRef(docRef));
  }
}

async function addDoc(colRef: any, data: any): Promise<any> {
  try {
    return await fbAddDoc(colRef, data);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, getPathFromRef(colRef));
  }
}

async function setDoc(docRef: any, data: any, options?: any): Promise<any> {
  try {
    return await fbSetDoc(docRef, data, options);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, getPathFromRef(docRef));
  }
}

async function updateDoc(docRef: any, data: any): Promise<any> {
  try {
    return await fbUpdateDoc(docRef, data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, getPathFromRef(docRef));
  }
}

async function deleteDoc(docRef: any): Promise<any> {
  try {
    return await fbDeleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, getPathFromRef(docRef));
  }
}


// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const ADMIN_TOKEN = 'oydei_secure_admin_session_token_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'oydei2026';

// Express Setup
const app = express();
app.use(express.json());

// Helper to check authentication
const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === ADMIN_TOKEN) {
      return next();
    }
  }
  return res.status(401).json({ success: false, message: 'Unauthorized. Invalid admin session token.' });
};

// Seed Data helper
async function seedDefaultData() {
  try {
    // 1. Seed Programmes
    const progSnap = await getDocs(collection(db, 'programmes'));
    if (progSnap.empty) {
      console.log('Seeding programmes into Firestore...');
      const defaultProgrammes = [
        {
          id: 'life-coaching',
          title: 'Life Coaching',
          description: 'Personalized guidance helping you discover your identity, align actions with purpose, and transition successfully into your target career.',
          area: 'Life Coaching',
          benefits: ['Self-discovery & value alignment', 'Goal setting and action plans', 'Navigating career transitions'],
          duration: '6-12 Weeks',
          targetAudience: 'Students, Graduates, Professionals',
        },
        {
          id: 'wellbeing-counselling',
          title: 'Counselling & Wellbeing Support',
          description: 'A safe, confidential space offering mental health support, emotional healing, and resilience development to deal with emotional baggage.',
          area: 'Counselling & Wellbeing',
          benefits: ['Emotional baggage identification & treatment', 'Anxiety and stress management', 'Confidential one-to-one counseling'],
          duration: 'On-demand sessions',
          targetAudience: 'Youth, Students, & Helping Professionals',
        },
        {
          id: 'capacity-building',
          title: 'Capacity Building & Leadership',
          description: 'Fostering productivity, time management, emotional intelligence, and effective leadership competencies for youth.',
          area: 'Capacity Building',
          benefits: ['Time management and school-life balance', 'Emotional and social intelligence', 'Public speaking and communication training'],
          duration: 'Periodic workshops',
          targetAudience: 'Aspiring Leaders, Youth Leaders',
        },
        {
          id: 'career-development',
          title: 'Career Development & Employability Support',
          description: 'Acquire practical skills, build global career intelligence, prepare professional resumes, and secure mentorship from international industry leaders.',
          area: 'Career Development',
          benefits: ['Global career intelligence', 'CV writing and interview preparation', 'Industry mentorship matches'],
          duration: 'Ongoing',
          targetAudience: 'Job Seekers, Final Year Students, Graduates',
        },
        {
          id: 'certifications',
          title: 'Professional Certifications',
          description: 'Enhance your professional credibility and global fit through industry-certified courses and capacity building credentials.',
          area: 'Certifications',
          benefits: ['Global certification recognition', 'Skill verification and assessments', 'Hands-on project validation'],
          duration: 'Self-paced / Cohort based',
          targetAudience: 'Professionals, Graduates',
        },
        {
          id: 'scholarships',
          title: 'Scholarships & Financial Support',
          description: 'Securing educational funding and career development stipends for talented youths with real financial needs.',
          area: 'Scholarships & Financial Support',
          benefits: ['Educational tuition sponsorships', 'Empowerment equipment and project grants', 'Financial need alleviation'],
          duration: 'Annual cycles',
          targetAudience: 'Underrepresented and brilliant youths',
        }
      ];

      for (const prog of defaultProgrammes) {
        await setDoc(doc(db, 'programmes', prog.id), prog);
      }
    }

    // 2. Seed Events
    const eventSnap = await getDocs(collection(db, 'events'));
    if (eventSnap.empty) {
      console.log('Seeding previous events into Firestore...');
      const defaultEvents = previousEvents;

      for (const ev of defaultEvents) {
        await setDoc(doc(db, 'events', ev.id), ev);
      }
    }

    // 3. Seed Partners
    console.log('Seeding board of trustees & partners with real photos into Firestore...');
    const defaultPartners = [
        ...trustees.map((t, index) => ({ id: `trustee-${index + 1}`, name: t.name, role: t.role, affiliation: t.desc, imageUrl: t.imageUrl })),
        ...technicalPartners
      ];

    for (const partner of defaultPartners) {
      await setDoc(doc(db, 'partners', partner.id), partner);
    }

    // 4. Seed Testimonials
    const testSnap = await getDocs(collection(db, 'testimonials'));
    if (testSnap.empty) {
      console.log('Seeding testimonials into Firestore...');
      const defaultTestimonials = [
        {
          id: 'test-1',
          name: 'Chinedu Egwu',
          role: 'Graduate, Mechanical Engineering UNN',
          content: 'The Career Advancement Seminar in 2025 gave me contacts in Qatar. Thanks to OYDEI coaching, I completed my CV rewrite and secured a global internship.',
          rating: 5
        },
        {
          id: 'test-2',
          name: 'Amara Nnaji',
          role: 'Postgraduate Student, Special Needs Education',
          content: 'The Group Research Writing Workshop in June 2026 was exactly what I needed. I went from being completely stuck on my literature review to producing a clear draft in two days.',
          rating: 5
        },
        {
          id: 'test-3',
          name: 'Tobi Alabi',
          role: 'Secondary School Participant, St. Cathrins',
          content: 'The Career Day was an eye-opener. Hearing Dr. Otu and the other coaches speak about understanding the fundamentals of career choices helped me choose my pathway with confidence.',
          rating: 5
        },
        {
          id: 'test-4',
          name: 'Aniefiok Bassey',
          role: 'Beneficiary, Counselling Centre',
          content: 'The 1-on-1 mental health support and life coaching sessions helped me dissolve severe emotional baggage and stress during my final year exams. Absolutely life-changing.',
          rating: 5
        }
      ];

      for (const t of defaultTestimonials) {
        await setDoc(doc(db, 'testimonials', t.id), t);
      }
    }

    // 5. Seed Certificates
    const certSnap = await getDocs(collection(db, 'certificates'));
    if (certSnap.empty) {
      console.log('Seeding initial verification certificate...');
      await setDoc(doc(db, 'certificates', 'cert-1'), {
        id: 'cert-1',
        certificateNumber: 'OYDEI-2026-001',
        recipientName: 'Emeka Okafor',
        programmeTitle: 'Professional Capacity Building and Leadership Course',
        issueDate: '2026-06-20',
        grade: 'Distinction',
        isValid: true
      });
      await setDoc(doc(db, 'certificates', 'cert-2'), {
        id: 'cert-2',
        certificateNumber: 'OYDEI-2025-412',
        recipientName: 'Chioma Ndubuisi',
        programmeTitle: 'Global Employability & Career Intelligence Seminar',
        issueDate: '2025-11-25',
        grade: 'Pass',
        isValid: true
      });
    }

    // 6. Seed Blog Posts
    const blogSnap = await getDocs(collection(db, 'blog_posts'));
    if (blogSnap.empty) {
      console.log('Seeding blog posts into Firestore...');
      const defaultBlogs = [
        {
          id: 'blog-1',
          title: 'Understanding the Fundamentals of Career Choice',
          slug: 'fundamentals-of-career-choice',
          content: `### Choosing a Career Pathway: A Purpose-Driven Guide

Making a career choice is one of the most critical turning points in a young person's life. At OYDEI, we believe that career paths must start with a alignment of:
1. **Internal Identity**: Who are you? What are your spiritual, behavioral, and personal strengths?
2. **Purpose and Calling**: What impact do you desire to make?
3. **Market Provisions**: Where is the global demand for your talents?

In our recent outreach to St. Cathrin Secondary School, Nsukka, we addressed over 500 students. We explored strategies for students to systematically research careers instead of relying on default parental pressure. If you are struggling with a career transition, start with self-discovery and join our ongoing 1-on-1 life coaching program at the UC Network Life Coaching Centre.`,
          excerpt: 'A comprehensive guide on aligning career choices with personal identity, internal values, and global market demands.',
          author: 'Dr. Mkpoikanke Sunday Otu (Ph.D)',
          category: 'Career Guidance',
          imageUrl: '/images/events/event-13.png',
          publishedAt: '2026-06-15'
        },
        {
          id: 'blog-2',
          title: 'Conquering Emotional Baggage in the Helping Professions',
          slug: 'conquering-emotional-baggage',
          content: `### Identifying and Healing Emotional Crises

Professional counsellors, social workers, teachers, and pastors often absorb the traumatic energies and emotional stress of the individuals they support. This phenomenon is known as emotional accumulation, or emotional baggage.

In our workshop at Kennan Lodge, we unpacked the primary causes, identification markers, and clinical/spiritual treatments for emotional baggage.

#### Core Indicators of Emotional Baggage:
- **Compartmentalization**: Ignoring personal stress to focus strictly on clients.
- **Vicarious Burnout**: Feeling exhausted, cynical, or anxious due to client narratives.
- **Compromised Social Intelligence**: Snapping at family members or colleagues due to pent-up pressure.

By enhancing our emotional and social intelligence, we increase our capacity to heal others without breaking ourselves. Contact the OYDEI Counselling Centre for a confidential consultation or capacity training session.`,
          excerpt: 'An deep-dive into secondary trauma, vicarious burnout, and techniques to maintain emotional hygiene for mental health workers.',
          author: 'Dr. Mkpoikanke Sunday Otu (Ph.D)',
          category: 'Mental Health Support',
          imageUrl: '/images/events/event-10.jpeg',
          publishedAt: '2026-06-10'
        }
      ];

      for (const blog of defaultBlogs) {
        await setDoc(doc(db, 'blog_posts', blog.id), blog);
      }
    }

    // 7. Seed Gallery Items
    const gallerySnap = await getDocs(collection(db, 'gallery_items'));
    if (gallerySnap.empty) {
      console.log('Seeding gallery items into Firestore...');
      const defaultGalleryItems = galleryItems;

      for (const item of defaultGalleryItems) {
        await setDoc(doc(db, 'gallery_items', item.id), item);
      }
    }

    console.log('OYDEI database seeding completed successfully!');
  } catch (err) {
    console.error('Error during OYDEI database seeding:', err);
  }
}

// Trigger Seeding
seedDefaultData();


// --- API ROUTES ---

// Public Routes
app.get('/api/programmes', async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'programmes'));
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/programmes/apply', async (req, res) => {
  try {
    const data = req.body;
    const application = {
      ...data,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'programme_applications'), application);
    
    // Simulate Email notification
    console.log(`[EMAIL NOTIFICATION] Sent registration email to ${data.email} for programme ${data.programmeTitle}`);
    
    res.status(201).json({ id: docRef.id, ...application });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'events'));
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/blog', async (req, res) => {
  try {
    const search = req.query.search as string;
    const snap = await getDocs(collection(db, 'blog_posts'));
    let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    
    if (search) {
      const queryLower = search.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(queryLower) || 
        item.content.toLowerCase().includes(queryLower) ||
        item.category.toLowerCase().includes(queryLower)
      );
    }
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/blog/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const q = query(collection(db, 'blog_posts'), where('slug', '==', slug));
    const snap = await getDocs(q);
    if (snap.empty) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    const docData = snap.docs[0];
    res.json({ id: docData.id, ...docData.data() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'gallery_items'));
    let items: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (items.length === 0) {
      // Return beautiful fallback events photos
      items = [
        {
          id: 'gal-1',
          title: 'Dr. Otu leading Career Transitions Session',
          description: 'A cohort of UNN students engaging in career mapping drills',
          category: 'Workshops',
          imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60',
          date: '2023-03-23'
        },
        {
          id: 'gal-2',
          title: 'Public Speaking Confidence Drills',
          description: 'Participants practicing presentation strategies on stage',
          category: 'Public Speaking',
          imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=60',
          date: '2023-05-06'
        },
        {
          id: 'gal-3',
          title: 'Research Writing Seminar Group Photo',
          description: 'Special Needs Education postgraduate students at OYDEI centre',
          category: 'R&D',
          imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=60',
          date: '2026-06-20'
        }
      ];
    }
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/partners', async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'partners'));
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'testimonials'));
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/scholarships/apply', async (req, res) => {
  try {
    const data = req.body;
    const application = {
      ...data,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'scholarship_applications'), application);
    
    // Simulate Email notification
    console.log(`[EMAIL NOTIFICATION] Sent scholarship confirmation to ${data.email} for ${data.courseOfStudy}`);
    
    res.status(201).json({ id: docRef.id, ...application });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/counselling/book', async (req, res) => {
  try {
    const data = req.body;
    const booking = {
      ...data,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'counselling_bookings'), booking);
    
    // Simulate Email notification
    console.log(`[EMAIL NOTIFICATION] Sent booking alert to ${data.email} for counselling on ${data.preferredDate}`);
    
    res.status(201).json({ id: docRef.id, ...booking });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const data = req.body;
    const contact = {
      ...data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'contact_messages'), contact);
    
    // Simulate Email notification
    console.log(`[EMAIL NOTIFICATION] Sent contact receipt to ${data.email} for query: ${data.subject}`);
    
    res.status(201).json({ id: docRef.id, ...contact });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if already subscribed
    const q = query(collection(db, 'newsletter_subscribers'), where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return res.status(200).json({ success: true, message: 'You are already subscribed to our newsletter!' });
    }

    const docRef = await addDoc(collection(db, 'newsletter_subscribers'), {
      email,
      subscribedAt: new Date().toISOString()
    });
    
    res.status(201).json({ success: true, message: 'Subscribed successfully!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/donations/submit', async (req, res) => {
  try {
    const data = req.body;
    const donation = {
      ...data,
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'donations'), donation);
    res.status(201).json({ id: docRef.id, ...donation });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/certificates/verify/:number', async (req, res) => {
  try {
    const certNumber = req.params.number;
    const q = query(collection(db, 'certificates'), where('certificateNumber', '==', certNumber));
    const snap = await getDocs(q);
    if (snap.empty) {
      return res.status(404).json({ success: false, message: 'Certificate not found. Please verify the registration code.' });
    }
    const docData = snap.docs[0];
    res.json({ id: docData.id, ...docData.data() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/tracking', async (req, res) => {
  try {
    const { type, email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    
    let colName = type === 'scholarship' ? 'scholarship_applications' : 'programme_applications';
    const q = query(collection(db, colName), where('email', '==', email), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// AI Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation messages payload' });
    }

    // Build rich prompt detailing OYDEI
    const systemPrompt = `You are Dr. Mkpoikanke Sunday Otu, Chairperson & Founder of OYDEI (Otu Youth Development & Empowerment Initiative) and an expert counsellor and human development specialist. 
You are acting as an AI Career and Life Coach for youths on the OYDEI web platform.
Keep your responses helpful, practical, encouraging, and anchored in godly values and career empowerment.
Be clear, direct, and empathetic. Refer to OYDEI programs like counseling, internships, and workshops where appropriate.
Provide highly structured advice using lists or headers. Keep the response to 200-300 words.

Here is info about OYDEI to ground your responses:
- Founded: 2019, NGO Reg: 2022
- Mission: Equip youth with holistic, data-driven programs addressing mental, social, economic challenges.
- Services: Life Coaching, Counselling, Capacity Building, Career Development, Certifications, Scholarships.
- Location: Third Floor (Right Wing), UC Network, opposite University of Nigeria, Nsukka, Enugu State, Nigeria.
- Email: lcoaching.counselling@gmail.com, Phone: 08071888392.
- Motto: Transform, Empower and Deploy (TED).`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }))
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
    });

    const reply = response.text || "I am currently processing your inquiry. Please reach out via lcoaching.counselling@gmail.com for direct support.";
    res.json({ reply });
  } catch (err: any) {
    console.error('Gemini call error:', err);
    res.status(500).json({ success: false, message: 'AI Advisor is briefly offline. Please try again soon!' });
  }
});

// Admin Routes (Protected)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect administrator password.' });
  }
});

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const pApps = await getDocs(collection(db, 'programme_applications'));
    const sApps = await getDocs(collection(db, 'scholarship_applications'));
    const bookings = await getDocs(collection(db, 'counselling_bookings'));
    const msgs = await getDocs(collection(db, 'contact_messages'));
    const subs = await getDocs(collection(db, 'newsletter_subscribers'));
    
    res.json({
      programmeApplicationsCount: pApps.size,
      scholarshipApplicationsCount: sApps.size,
      counsellingBookingsCount: bookings.size,
      unreadMessagesCount: msgs.docs.filter(d => !d.data().isRead).length,
      newsletterSubscribersCount: subs.size,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/programme-applications', authenticateAdmin, async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'programme_applications'));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/admin/programme-applications/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ref = doc(db, 'programme_applications', id);
    await updateDoc(ref, { status });
    res.json({ id, status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/scholarship-applications', authenticateAdmin, async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'scholarship_applications'));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/admin/scholarship-applications/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ref = doc(db, 'scholarship_applications', id);
    await updateDoc(ref, { status });
    res.json({ id, status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/counselling-bookings', authenticateAdmin, async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'counselling_bookings'));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/admin/counselling-bookings/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ref = doc(db, 'counselling_bookings', id);
    await updateDoc(ref, { status });
    res.json({ id, status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/contact-messages', authenticateAdmin, async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'contact_messages'));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/admin/contact-messages/:id/read', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ref = doc(db, 'contact_messages', id);
    await updateDoc(ref, { isRead: true });
    res.json({ id, isRead: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/newsletter-subscribers', authenticateAdmin, async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'newsletter_subscribers'));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create Blog
app.post('/api/admin/blog', authenticateAdmin, async (req, res) => {
  try {
    const data = req.body;
    const post = {
      ...data,
      publishedAt: new Date().toISOString().split('T')[0],
    };
    const docRef = await addDoc(collection(db, 'blog_posts'), post);
    res.status(201).json({ id: docRef.id, ...post });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/blog/:id', authenticateAdmin, async (req, res) => {
  try {
    await deleteDoc(doc(db, 'blog_posts', req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create Gallery
app.post('/api/admin/gallery', authenticateAdmin, async (req, res) => {
  try {
    const data = req.body;
    const item = {
      ...data,
      date: new Date().toISOString().split('T')[0],
    };
    const docRef = await addDoc(collection(db, 'gallery_items'), item);
    res.status(201).json({ id: docRef.id, ...item });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/gallery/:id', authenticateAdmin, async (req, res) => {
  try {
    await deleteDoc(doc(db, 'gallery_items', req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create Partner
app.post('/api/admin/partners', authenticateAdmin, async (req, res) => {
  try {
    const data = req.body;
    const docRef = await addDoc(collection(db, 'partners'), data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/partners/:id', authenticateAdmin, async (req, res) => {
  try {
    await deleteDoc(doc(db, 'partners', req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create Testimonial
app.post('/api/admin/testimonials', authenticateAdmin, async (req, res) => {
  try {
    const data = req.body;
    const docRef = await addDoc(collection(db, 'testimonials'), data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/testimonials/:id', authenticateAdmin, async (req, res) => {
  try {
    await deleteDoc(doc(db, 'testimonials', req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create Certificates
app.post('/api/admin/certificates', authenticateAdmin, async (req, res) => {
  try {
    const data = req.body;
    const cert = {
      ...data,
      isValid: true,
      issueDate: new Date().toISOString().split('T')[0],
    };
    const docRef = await addDoc(collection(db, 'certificates'), cert);
    res.status(201).json({ id: docRef.id, ...cert });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/certificates', authenticateAdmin, async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'certificates'));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Local development server. In Vercel, the Express app is exported as a serverless function from api/[...path].ts.
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OYDEI Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
