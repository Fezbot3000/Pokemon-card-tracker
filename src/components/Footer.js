import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__content">
        <div className="footer__grid">
          <div className="footer__section footer__section--main">
            <h3 className="footer__brand">MyCardTracker</h3>
            <p className="footer__description">
              Australia's most trusted platform for trading card collection
              management and trading.
            </p>
          </div>

          <div className="footer__section">
            <h4 className="footer__heading">Platform</h4>
            <ul className="footer__list">
              <li className="footer__list-item">
                <Link
                  to="/login"
                  className="footer__link"
                >
                  Sign Up
                </Link>
              </li>
              <li className="footer__list-item">
                <Link
                  to="/features"
                  className="footer__link"
                >
                  Features
                </Link>
              </li>
              <li className="footer__list-item">
                <Link
                  to="/pricing"
                  className="footer__link"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer__section">
            <h4 className="footer__heading">Card Guides</h4>
            <ul className="footer__list">
              <li className="footer__list-item">
                <Link
                  to="/collecting-guide"
                  className="footer__link"
                >
                  Collecting Guide
                </Link>
              </li>
              <li className="footer__list-item">
                <Link
                  to="/pokemon-sets"
                  className="footer__link"
                >
                  Card Sets & Prices
                </Link>
              </li>
              <li className="footer__list-item">
                <Link
                  to="/pokemon-investment-guide"
                  className="footer__link"
                >
                  Investment Guide
                </Link>
              </li>
              <li className="footer__list-item">
                <Link
                  to="/grading-integration"
                  className="footer__link"
                >
                  Grading Integration
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer__section">
            <h4 className="footer__heading">Support</h4>
            <ul className="footer__list">
              <li className="footer__list-item">
                <Link
                  to="/help-center"
                  className="footer__link"
                >
                  Help Center
                </Link>
              </li>
              <li className="footer__list-item">
                <Link
                  to="/about"
                  className="footer__link"
                >
                  About
                </Link>
              </li>
              <li className="footer__list-item">
                <Link
                  to="/privacy"
                  className="footer__link"
                >
                  Privacy
                </Link>
              </li>
              <li className="footer__list-item">
                <Link
                  to="/terms"
                  className="footer__link"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">
            {new Date().getFullYear()} MyCardTracker Australia. Made with ❤️ for
            card collectors worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
