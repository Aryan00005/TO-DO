import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { FaUserPlus } from "react-icons/fa";

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
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      // Use the full backend URL for registration
      await axios.post("http://localhost:9000/api/auth/register", { name, userId, email, password });
      navigate("/login");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Registration failed");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed");
      }
    }
  };

  return (
    <PageContainer>
      <AuthBox>
        <IconCircle>
          <FaUserPlus size={36} />
        </IconCircle>
        <AuthTitle>Register</AuthTitle>
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
          <AuthInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
