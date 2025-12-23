import styled from "styled-components";

export const Layout = styled.div`
  display: flex;
  min-height: 100vh;
`;

export const Sidebar = styled.div`
  width: 220px;
  background: #22223b;
  color: #fff;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const NavItem = styled.div<{ $active?: boolean }>`
  padding: 0.75rem 1rem;
  background: ${({ $active }) => ($active ? "#4a4e69" : "transparent")};
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  &:hover {
    background: #4a4e69;
  }
`;

export const Main = styled.div`
  flex: 1;
  background: #f2e9e4;
  padding: 2rem;
`;

export const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const DashboardTitle = styled.h1`
  font-size: 2rem;
  color: #22223b;
`;

export const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
`;

export const TaskCard = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(34, 34, 59, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const TaskTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: #22223b;
`;

export const TaskDesc = styled.p`
  margin: 0;
  color: #4a4e69;
`;

export const Status = styled.div<{ $status: string }>`
  font-weight: bold;
  color: ${({ $status }) =>
    $status === "completed" ? "#16a34a" : "#b5179e"};
`;


export const TaskActions = styled.div`
  margin-top: 1rem;
`;

export const Button = styled.button`
  padding: 0.5rem 1rem;
  background: #22223b;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
`;

export const Input = styled.input`
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

export const Select = styled.select`
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

export const ProfileBox = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(34, 34, 59, 0.08);
  max-width: 400px;
`;

export const Label = styled.div`
  font-weight: bold;
  margin-bottom: 0.25rem;
  color: #22223b;
`;

export const Value = styled.div`
  margin-bottom: 1rem;
  color: #4a4e69;
`;
