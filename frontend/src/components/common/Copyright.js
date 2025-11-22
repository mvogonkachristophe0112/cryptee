import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaCopyright, FaShieldAlt, FaFileContract } from 'react-icons/fa';
import { useTranslation } from '../../context/TranslationContext';

const Copyright = () => {
  const { t } = useTranslation();

  const licenseText = `Copyright (c) 2025 MvogoNka Christophe Ulrich
All rights reserved.

This software and associated documentation files (the "Software") are proprietary and confidential.
The Software is owned by MvogoNka Christophe Ulrich and is protected by copyright law and international treaties.

PERMISSION IS HEREBY EXPRESSLY DENIED to any person obtaining a copy of this software and associated documentation files (the "Software") to:

1. Use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software
2. Allow others to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software
3. Reverse engineer, decompile, or disassemble the Software
4. Remove or alter any copyright notices or other proprietary markings

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For licensing inquiries, please contact: MvogoNka Christophe Ulrich`;

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="page-header text-center mb-5">
        <FaCopyright size={48} className="text-primary mb-3" />
        <h1>{t('copyright.title', 'Cryptee Copyright & License')}</h1>
        <p className="text-muted">{t('copyright.subtitle', 'Legal information and licensing terms')}</p>
      </div>

      <Row className="justify-content-center">
        <Col lg={10}>
          {/* Main License Card */}
          <Card className="mb-4 shadow">
            <Card.Header className="bg-primary text-white">
                <h3 className="mb-0 d-flex align-items-center">
                  <FaFileContract className="me-2" />
                  {t('copyright.license_agreement', 'Software License Agreement')}
                </h3>
              </Card.Header>
            <Card.Body>
              <div className="license-text">
                {licenseText.split('\n').map((line, index) => (
                  <p key={index} className={line.trim() === '' ? 'mb-3' : 'mb-1'}>
                    {line === '' ? '\u00A0' : line}
                  </p>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Additional Information */}
          <Row>
            <Col md={6}>
              <Card className="h-100">
                <Card.Header>
                    <h5 className="mb-0 d-flex align-items-center">
                      <FaShieldAlt className="me-2 text-success" />
                      {t('copyright.intellectual_property', 'Intellectual Property')}
                    </h5>
                  </Card.Header>
                <Card.Body>
                  <p>
                    Cryptee is a proprietary software application developed by MvogoNka Christophe Ulrich.
                    All intellectual property rights, including but not limited to copyrights, trademarks,
                    and trade secrets, are owned by the developer.
                  </p>
                  <p>
                    The Cryptee name, logo, and associated branding are protected intellectual property.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="h-100">
                <Card.Header>
                    <h5 className="mb-0 d-flex align-items-center">
                      <FaCopyright className="me-2 text-info" />
                      {t('copyright.usage_rights', 'Usage Rights')}
                    </h5>
                  </Card.Header>
                <Card.Body>
                  <p>
                    This software is provided for personal use only. Commercial use requires explicit
                    written permission from the copyright holder.
                  </p>
                  <p>
                    Users are granted limited, non-exclusive, non-transferable rights to use the software
                    in accordance with the terms specified in this license.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Contact Information */}
          <Card className="mt-4">
            <Card.Header>
              <h5 className="mb-0">{t('copyright.contact', 'Contact Information')}</h5>
            </Card.Header>
            <Card.Body>
              <p>
                For licensing inquiries, partnership opportunities, or legal questions regarding
                Cryptee, please contact:
              </p>
              <div className="contact-info">
                <strong>MvogoNka Christophe Ulrich</strong><br />
                Copyright Holder & Developer<br />
                Cryptee Software
              </div>
            </Card.Body>
          </Card>

          {/* Footer Note */}
          <div className="text-center mt-4 text-muted">
            <small>
              This license applies to all versions and distributions of Cryptee software.
              Last updated: {new Date().toLocaleDateString()}
            </small>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Copyright;