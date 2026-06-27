import { useState } from 'react'
import { Mail, Phone, MapPin, Heart, Users, BookOpen, Briefcase, Award, ArrowRight } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')

  const services = [
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Life Coaching',
      description: 'Personalized guidance for identity discovery and career transitions'
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Counselling & Wellbeing',
      description: 'Mental health support and emotional healing in a safe space'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Capacity Building',
      description: 'Leadership training and emotional intelligence development'
    },
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: 'Career Development',
      description: 'Global career intelligence and professional mentorship'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Certifications',
      description: 'Industry-recognized professional certifications'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Scholarships',
      description: 'Financial support for talented youth in need'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                O
              </div>
              <span className="font-bold text-lg text-gray-800 hidden sm:inline">OYDEI</span>
            </div>
            <div className="flex gap-4 text-sm font-medium">
              <button onClick={() => setActiveTab('home')} className={`px-4 py-2 rounded ${activeTab === 'home' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:text-blue-500'}`}>
                Home
              </button>
              <button onClick={() => setActiveTab('services')} className={`px-4 py-2 rounded ${activeTab === 'services' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:text-blue-500'}`}>
                Services
              </button>
              <button onClick={() => setActiveTab('contact')} className={`px-4 py-2 rounded ${activeTab === 'contact' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:text-blue-500'}`}>
                Contact
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {activeTab === 'home' && (
        <section className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl font-bold mb-6">OYDEI</h1>
            <p className="text-2xl sm:text-3xl font-semibold mb-4">Otu Youth Development & Empowerment Initiative</p>
            <p className="text-lg sm:text-xl mb-8 opacity-90">Transform, Empower and Deploy</p>
            <p className="text-base sm:text-lg mb-8 opacity-85 max-w-2xl mx-auto">
              Equipping youth with holistic, data-driven programs addressing mental, social, and economic challenges.
            </p>
            <button className="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition flex items-center gap-2 mx-auto">
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      )}

      {/* Services Section */}
      {activeTab === 'services' && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">Our Services</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, idx) => (
                <div key={idx} className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition">
                  <div className="text-blue-500 mb-4">{service.icon}</div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">{service.title}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      {activeTab === 'contact' && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">Get in Touch</h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <Mail className="w-6 h-6 text-blue-500" />
                  <div>
                    <h3 className="font-bold text-gray-800">Email</h3>
                    <p className="text-gray-600">lcoaching.counselling@gmail.com</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <Phone className="w-6 h-6 text-blue-500" />
                  <div>
                    <h3 className="font-bold text-gray-800">Phone</h3>
                    <p className="text-gray-600">+234 807 188 8392</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-blue-500 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Location</h3>
                  <p className="text-gray-600">
                    Third Floor (Right Wing)<br />
                    UC Network<br />
                    Opposite University of Nigeria<br />
                    Nsukka, Enugu State, Nigeria
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg mt-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Life?</h3>
              <p className="mb-6">Join thousands of youth who have benefited from our programs</p>
              <button className="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
                Apply Now
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">OYDEI</h4>
              <p className="text-gray-400 text-sm">Transform, Empower and Deploy</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Services</h4>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>Life Coaching</li>
                <li>Counselling</li>
                <li>Career Development</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>About Us</li>
                <li>Blog</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Follow Us</h4>
              <p className="text-gray-400 text-sm">Social media links coming soon</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-gray-400 text-center text-sm">
              &copy; 2026 OYDEI. All rights reserved. | Founded by Dr. Mkpoikanke Sunday Otu (Ph.D)
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
