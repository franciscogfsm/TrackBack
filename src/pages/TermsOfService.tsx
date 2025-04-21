import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
            Terms of Service
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
                These Terms of Service govern your use of TrackBack's athletic
                performance management platform. By using our services, you
                agree to these terms. Please read them carefully.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. GDPR Compliance
              </h2>
              <p className="text-gray-700 mb-4">
                We are committed to protecting your personal data in accordance
                with the General Data Protection Regulation (GDPR). Our
                processing activities are based on:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  Your explicit consent for health-related data processing
                </li>
                <li>The necessity to perform our contract with you</li>
                <li>
                  Our legitimate interests in providing and improving our
                  services
                </li>
                <li>Compliance with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Service Description
              </h2>
              <p className="text-gray-700 mb-4">
                TrackBack provides athletic performance management tools,
                including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Performance tracking and analytics</li>
                <li>Team management features</li>
                <li>Training program organization</li>
                <li>Health and wellness monitoring</li>
                <li>AI-powered performance insights and recommendations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. AI-Powered Services
              </h2>
              <p className="text-gray-700 mb-4">
                Our platform includes AI-powered features provided through
                OpenAI's services:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  We use OpenAI to analyze performance data and generate
                  personalized insights
                </li>
                <li>
                  These insights are provided "as is" and should be considered
                  recommendations rather than definitive guidance
                </li>
                <li>
                  While we strive for accuracy, you should always use
                  professional judgment when acting on AI-generated insights
                </li>
                <li>
                  You have the right to opt-out of AI-powered features while
                  maintaining access to all other services
                </li>
              </ul>
              <p className="text-gray-700 mb-4">
                By using our AI-powered features, you acknowledge that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  Selected performance data may be processed by OpenAI under
                  strict privacy controls
                </li>
                <li>
                  You can request human review of automated decisions that
                  significantly affect you
                </li>
                <li>
                  We maintain oversight of AI-generated content and implement
                  appropriate safeguards
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. User Obligations
              </h2>
              <p className="text-gray-700 mb-4">You agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide accurate information</li>
                <li>Maintain the confidentiality of your account</li>
                <li>Use the service in compliance with applicable laws</li>
                <li>Respect the privacy and rights of other users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Data Processing Agreement
              </h2>
              <p className="text-gray-700 mb-4">
                When processing personal data on behalf of clubs or
                organizations:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>We act as a data processor under GDPR Article 28</li>
                <li>
                  We implement appropriate technical and organizational measures
                </li>
                <li>We assist in fulfilling data subject rights requests</li>
                <li>We provide notice of any data breaches within 72 hours</li>
                <li>
                  We ensure our sub-processors (including OpenAI) comply with
                  GDPR requirements
                </li>
                <li>
                  We maintain records of all AI-powered processing activities
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. International Data Transfers
              </h2>
              <p className="text-gray-700 mb-4">
                We use Standard Contractual Clauses (SCCs) for international
                data transfers. These ensure appropriate safeguards for personal
                data transferred outside the EEA.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Subscription and Payments
              </h2>
              <p className="text-gray-700 mb-4">
                Details about our subscription plans, payment terms, and
                cancellation policies are provided during the registration
                process. All payments are processed securely through our payment
                providers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Intellectual Property
              </h2>
              <p className="text-gray-700 mb-4">
                All content and functionality on TrackBack is protected by
                intellectual property rights. Users retain ownership of their
                data while granting us necessary licenses to provide the
                service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Limitation of Liability
              </h2>
              <p className="text-gray-700 mb-4">
                To the extent permitted by law, we limit our liability for any
                damages arising from the use of our services. This doesn't
                affect your statutory rights under GDPR or consumer protection
                laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Changes to Terms
              </h2>
              <p className="text-gray-700 mb-4">
                We may update these terms to reflect changes in our services or
                legal requirements. We will notify you of any material changes
                and obtain fresh consent where required by GDPR.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Contact Information
              </h2>
              <p className="text-gray-700 mb-4">
                For any questions about these terms, please contact us at:
              </p>
              <p className="text-gray-700 mb-4">
                Email: martinsfrancisco2005@gmail.com
                <br />
                Address: [Your Business Address]
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
