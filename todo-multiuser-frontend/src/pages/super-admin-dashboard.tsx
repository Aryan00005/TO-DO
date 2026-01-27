import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import { FaBuilding, FaUserShield, FaSignOutAlt, FaPlus, FaUsers, FaClock, FaCheck, FaTimes } from "react-icons/fa";

interface SuperAdminDashboardProps {
  user: any;
  onLogout: () => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onLogout }) => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [pendingAdmins, setPendingAdmins] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.isSuperAdmin) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem("jwt-token");
      const [companiesRes, pendingRes] = await Promise.all([
        axios.get("/auth/superadmin/companies", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get("/auth/superadmin/pending-admins", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setCompanies(companiesRes.data);
      setPendingAdmins(pendingRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleViewCompany = async (companyCode: string) => {
    try {
      const token = sessionStorage.getItem("jwt-token");
      const res = await axios.get(`/auth/superadmin/company/${companyCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCompany(res.data);
      setShowCompanyModal(true);
    } catch (err) {
      console.error("Error fetching company details:", err);
      setError("Failed to load company details");
    }
  };

  const handleAdminAction = async (adminId: string, action: 'approve' | 'reject') => {
    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.post("/auth/superadmin/admin-action", {
        adminId,
        action
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(`Admin ${action}d successfully!`);
      fetchData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${action} admin`);
    }
  };

  const handleCreateCompanyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = sessionStorage.getItem("jwt-token");
      await axios.post("/auth/superadmin/create-company-admin", {
        name: adminName,
        email: adminEmail,
        userId: adminUserId,
        password: adminPassword,
        company: companyName,
        companyCode: companyCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Company admin created successfully! Company Code: ${companyCode}`);
      setCompanyName("");
      setCompanyCode("");
      setAdminName("");
      setAdminEmail("");
      setAdminUserId("");
      setAdminPassword("");
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create company admin");
    } finally {
      setLoading(false);
    }
  };

  const generateCompanyCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setCompanyCode(code);
  };

  const handleLogout = () => {
    onLogout();
    navigate("/super-admin-login");
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaUserShield size={32} />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Super Admin Dashboard</h1>
            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>Welcome, {user.name}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Success/Error Messages */}
        {success && (
          <div style={{
            background: '#d1fae5',
            color: '#065f46',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #6ee7b7'
          }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #fca5a5'
          }}>
            {error}
          </div>
        )}

        {/* Pending Requests Alert */}
        {pendingAdmins.length > 0 && (
          <div style={{
            background: '#fef3c7',
            color: '#92400e',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaClock />
            <strong>{pendingAdmins.length} admin request{pendingAdmins.length > 1 ? 's' : ''} pending approval</strong>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              background: '#dbeafe',
              color: '#1e40af',
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaBuilding size={28} />
            </div>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Total Companies</p>
              <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', margin: '4px 0 0 0' }}>
                {companies.length}
              </h2>
            </div>
          </div>

          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              background: '#ddd6fe',
              color: '#5b21b6',
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUsers size={28} />
            </div>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Total Admins</p>
              <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', margin: '4px 0 0 0' }}>
                {companies.reduce((sum, c) => sum + c.adminCount, 0)}
              </h2>
            </div>
          </div>

          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              background: '#fef3c7',
              color: '#92400e',
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaClock size={28} />
            </div>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Pending Requests</p>
              <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', margin: '4px 0 0 0' }}>
                {pendingAdmins.length}
              </h2>
            </div>
          </div>
        </div>

        {/* Pending Admin Requests */}
        {pendingAdmins.length > 0 && (
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            marginBottom: '30px'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Pending Admin Requests ({pendingAdmins.length})
              </h2>
            </div>
            <div style={{ padding: '0' }}>
              {pendingAdmins.map(admin => (
                <div key={admin.id} style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>
                      {admin.name}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>
                      {admin.email} • {admin.user_id}
                    </p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                      Company: {admin.company} • Requested: {new Date(admin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleAdminAction(admin.id, 'approve')}
                      style={{
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      <FaCheck size={12} /> Approve
                    </button>
                    <button
                      onClick={() => handleAdminAction(admin.id, 'reject')}
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      <FaTimes size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Company Admin Button */}
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <FaPlus /> Create Company Admin
          </button>
        </div>

        {/* Companies List */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f9fafb'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
              Companies Overview
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
              Company codes are used by users to register under their company
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Company Code</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Admins</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Users</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company, index) => (
                  <tr 
                    key={index} 
                    onClick={() => handleViewCompany(company.name)}
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                      <span style={{ 
                        background: '#f3f4f6', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontFamily: 'monospace',
                        fontSize: '13px'
                      }}>
                        {company.name}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>
                      {company.adminCount}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6b7280' }}>
                      {company.userCount}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete company '${company.name}' and all its users?`)) {
                            const token = sessionStorage.getItem("jwt-token");
                            axios.delete(`/auth/superadmin/delete-company/${company.name}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            })
                            .then(() => {
                              setSuccess(`Company '${company.name}' deleted successfully!`);
                              fetchData();
                            })
                            .catch(err => {
                              setError(err.response?.data?.message || 'Failed to delete company');
                            });
                          }
                        }}
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Company Admin Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '24px' }}>
              Create Company Admin
            </h2>
            <form onSubmit={handleCreateCompanyAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                placeholder="Admin Name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              <input
                type="email"
                placeholder="Admin Email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              <input
                type="text"
                placeholder="Admin User ID"
                value={adminUserId}
                onChange={(e) => setAdminUserId(e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              <input
                type="password"
                placeholder="Admin Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              <input
                type="text"
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Company Code"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <button
                  type="button"
                  onClick={generateCompanyCode}
                  style={{
                    background: '#6b7280',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Generate
                </button>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Creating...' : 'Create Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: '#6b7280',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Details Modal */}
      {showCompanyModal && selectedCompany && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                  Company Details
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Code: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{selectedCompany.companyCode}</code>
                </p>
              </div>
              <button
                onClick={() => setShowCompanyModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                Admins ({selectedCompany.users.filter((u: any) => u.role === 'admin').length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedCompany.users.filter((u: any) => u.role === 'admin').map((admin: any) => (
                  <div key={admin.id} style={{
                    background: '#f9fafb',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>{admin.name}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>{admin.email} • {admin.user_id}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                      Status: <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: admin.account_status === 'active' ? '#d1fae5' : admin.account_status === 'pending' ? '#fef3c7' : '#fee2e2',
                        color: admin.account_status === 'active' ? '#065f46' : admin.account_status === 'pending' ? '#92400e' : '#991b1b'
                      }}>
                        {admin.account_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                Users ({selectedCompany.users.filter((u: any) => u.role !== 'admin').length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedCompany.users.filter((u: any) => u.role !== 'admin').map((user: any) => (
                  <div key={user.id} style={{
                    background: '#f9fafb',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>{user.name}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>{user.email} • {user.user_id}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
