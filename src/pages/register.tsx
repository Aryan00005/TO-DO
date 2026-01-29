import { useState, useEffect } from "react";
import axios from "../api/axios";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { FaUserPlus, FaEye, FaEyeSlash } from "react-icons/fa";

// Styled Components
const PageContainer = styled.div`
  height: 100vh;
  background: linear-gradient(120deg, #f5f7fa 0%, #e0e7ef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AuthBox = styled.div`
  background: #fff;
  padding: 72px 36px 32px 36px;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(30, 41, 59, 0.09), 0 1.5px 6px #c7d2fe;
  max-width: 390px;
  width: 100%;
  text-align: center;
  border: 2.5px solid #dbeafe;
  position: relative;
  overflow: visible;
`;

const IconCircle = styled.div`
  background: linear-gradient(135deg, #2563eb 60%, #60a5fa 100%);
  color: #fff;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 2px 12px #2563eb33;
  border: 4px solid #fff;
`;

const AuthTitle = styled.h1`
  font-family: 'Pacifico', cursive, sans-serif;
  font-size: 2.3rem;
  color: #1e293b;
  margin-bottom: 30px;
  letter-spacing: 1.5px;
  margin-top: 0;
`;

const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const AuthInput = styled.input`
  padding: 11px;
  border: 1.5px solid #dbeafe;
  border-radius: 8px;
  font-size: 1rem;
  background: #f1f5fa;
  transition: border 0.18s;
  &:focus {
    border-color: #2563eb;
    outline: none;
    background: #fff;
  }
`;

const AuthButton = styled.button`
  background: linear-gradient(90deg, #2563eb 60%, #60a5fa 100%);
  color: #fff;
  padding: 11px 18px;
  border: none;
  border-radius: 8px;
  font-size: 1.08rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
  box-shadow: 0 2px 8px #2563eb22;
  transition: background 0.18s;
  &:hover {
    background: linear-gradient(90deg, #1d4ed8 60%, #2563eb 100%);
  }
`;

const ErrorMsg = styled.p`
  color: #ef4444;
  margin-top: 12px;
  font-size: 1rem;
`;

const SwitchText = styled.div`
  margin-top: 18px;
  font-size: 0.98rem;
  color: #64748b;
  a {
    color: #2563eb;
    cursor: pointer;
    text-decoration: underline;
    margin-left: 6px;
  }
`;

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if this is a Google user from role selection
    const googleParam = searchParams.get('google');
    const googleToken = sessionStorage.getItem('google-auth-token');
    
    if (googleParam === 'true' && googleToken) {
      setIsGoogleUser(true);
      // Pre-fill data from Google token
      try {
        const payload = JSON.parse(atob(googleToken.split('.')[1]));
        if (payload.email) {
          setEmail(payload.email);
        }
        if (payload.name) {
          setName(payload.name);
        }
      } catch (err) {
        console.error('Error parsing Google token:', err);
      }
    }
  }, [searchParams]);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      console.log('🔄 Registration attempt:', { name, userId, email, companyCode, isGoogleUser });
      
      if (isGoogleUser) {
        // For Google users, call the new Google user registration endpoint
        const googleToken = sessionStorage.getItem('google-auth-token');
        const response = await axios.post("/auth/google-user-register", {
          token: googleToken,
          name,
          userId,
          email,
          password,
          companyCode
        });
        
        // Clear Google session data
        sessionStorage.removeItem('google-auth-token');
        sessionStorage.removeItem('selected-role');
        
        console.log('✅ Google user registration successful:', response.data);
        alert('Registration successful! Your account is pending approval from your company admin.');
        navigate("/pending-approval");
      } else {
        // Regular user registration
        const response = await axios.post("/auth/register", { name, userId, email, password, companyCode });
        console.log('✅ Registration successful:', response.data);
        
        alert('Registration successful! Your account is pending approval from your company admin.');
        navigate("/login");
      }
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 400) {
        setError('Registration failed: Please check all fields and ensure the company code is valid.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <PageContainer>
      <AuthBox>
        <IconCircle>
          <FaUserPlus size={36} />
        </IconCircle>
        <AuthTitle>{isGoogleUser ? 'Complete Registration' : 'Register'}</AuthTitle>
        <AuthForm onSubmit={handleSubmit}>
          <AuthInput
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <AuthInput
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            required
          />
          <AuthInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div style={{ position: 'relative' }}>
            <AuthInput
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ paddingRight: '45px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '16px'
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <AuthInput
            type="text"
            placeholder="Company Code (provided by admin)"
            value={companyCode}
            onChange={e => setCompanyCode(e.target.value)}
            required
          />
          <AuthButton type="submit">Register</AuthButton>
        </AuthForm>
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <SwitchText>
          Already have an account?
          <Link to="/login">Login</Link>
        </SwitchText>
      </AuthBox>
    </PageContainer>
  );
};

export default Register;
