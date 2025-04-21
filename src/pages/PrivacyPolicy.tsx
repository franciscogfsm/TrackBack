import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center text-white hover:text-blue-100 mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Privacy Policy
          </h1>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-700 mb-4">
                TrackBack ("we", "our", or "us") is committed to protecting your
                privacy and ensuring the security of your personal data. This
                Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you use our athletic performance
                management platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Legal Bases for Processing
              </h2>
              <p className="text-gray-700 mb-4">
                We process your personal data based on the following legal
                grounds:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Consent:</strong> For processing health-related data
                  and using analytics tools
                </li>
                <li>
                  <strong>Contractual Necessity:</strong> To provide our
                  services and fulfill our contractual obligations
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> For improving our
                  services, ensuring security, and marketing to existing
                  customers
                </li>
                <li>
                  <strong>Legal Obligation:</strong> To comply with applicable
                  laws and regulations
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Data We Collect
              </h2>
              <p className="text-gray-700 mb-4">
                We collect and process the following types of information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Account information (name, email, password)</li>
                <li>Profile data (age, gender, sports preferences)</li>
                <li>Performance metrics and training data</li>
                <li>Health-related data (with explicit consent)</li>
                <li>Device and usage information</li>
                <li>Communication data</li>
                <li>AI-generated insights based on your performance data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. AI-Powered Insights and Automated Processing
              </h2>
              <p className="text-gray-700 mb-4">
                We use OpenAI's services to provide personalized insights about
                your athletic performance. Here's what you need to know:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Data Processing:</strong> Selected performance data
                  and metrics may be shared with OpenAI to generate personalized
                  insights and recommendations.
                </li>
                <li>
                  <strong>Data Security:</strong> Data is shared securely and
                  anonymized where possible. OpenAI acts as a data processor
                  under our strict data protection requirements.
                </li>
                <li>
                  <strong>Purpose Limitation:</strong> Data is only shared for
                  the specific purpose of generating performance insights and
                  improving your training experience.
                </li>
                <li>
                  <strong>Automated Processing:</strong> The insights are
                  generated through automated processing, which may include
                  profiling based on your performance patterns.
                </li>
                <li>
                  <strong>Your Rights:</strong> You can opt-out of AI-powered
                  insights at any time through your account settings. You may
                  also request human review of any automated decisions that
                  significantly affect you.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Special Category Data (Health Data)
              </h2>
              <p className="text-gray-700 mb-4">
                In accordance with Article 9 of the GDPR, we only process
                health-related data (including WHOOP integration data) with your
                explicit consent. You have the right to withdraw this consent at
                any time. We implement additional security measures to protect
                this sensitive data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Third-Party Data Processors
              </h2>
              <p className="text-gray-700 mb-4">
                We work with the following key third-party data processors:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Supabase:</strong> For secure data storage and
                  database management
                </li>
                <li>
                  <strong>OpenAI:</strong> For generating performance insights
                  and recommendations
                </li>
              </ul>
              <p className="text-gray-700 mb-4">
                All our data processors are bound by Data Processing Agreements
                that ensure GDPR compliance and appropriate security measures.
                For international transfers, we implement additional safeguards
                as required by data protection laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Data Retention
              </h2>
              <p className="text-gray-700 mb-4">
                We retain your personal data for the following periods:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  Account information: While your account is active plus 2 years
                  after deletion
                </li>
                <li>
                  Performance data: 5 years from collection for historical
                  analysis
                </li>
                <li>
                  Health-related data: 2 years from collection, unless longer
                  retention is requested
                </li>
                <li>
                  Communication records: 3 years from the last interaction
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. International Data Transfers
              </h2>
              <p className="text-gray-700 mb-4">
                We use Supabase for data storage, which may involve transferring
                your data outside the European Economic Area (EEA). We ensure
                appropriate safeguards through Standard Contractual Clauses
                (SCCs) and additional technical measures. You can request a copy
                of these safeguards by contacting us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Cookies and Analytics
              </h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar technologies to enhance your
                experience. These include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Essential cookies: Required for basic functionality</li>
                <li>
                  Analytics cookies: To understand usage patterns (requires
                  consent)
                </li>
                <li>Preference cookies: To remember your settings</li>
              </ul>
              <p className="text-gray-700 mb-4">
                You can manage your cookie preferences through our cookie banner
                or browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Your Rights
              </h2>
              <p className="text-gray-700 mb-4">
                Under the GDPR, you have the following rights:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Access your personal data</li>
                <li>Rectify inaccurate data</li>
                <li>Erase your data ("right to be forgotten")</li>
                <li>Restrict processing</li>
                <li>Data portability</li>
                <li>Object to processing</li>
                <li>Withdraw consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Contact Information
              </h2>
              <p className="text-gray-700 mb-4">
                For any privacy-related queries or to exercise your rights,
                contact us at:
              </p>
              <p className="text-gray-700 mb-4">
                Email: martinsfrancisco2005@gmail.com
                <br />
                Address: [Your Business Address]
              </p>
              <p className="text-gray-700 mb-4">
                You have the right to lodge a complaint with your local data
                protection authority.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
