import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, Eye, Edit3, Trash2, Plus, Download, X, Check, AlertCircle, Loader, Building2, TrendingUp, Users, BarChart3 } from 'lucide-react';
import './App.css';

const CompanyStructureTool = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [activeView, setActiveView] = useState('upload');
  const [editingRow, setEditingRow] = useState(null);
  const [newCompany, setNewCompany] = useState({ name: '', parent: '', equity: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const fileInputRef = useRef(null);
  const chartCanvasRef = useRef(null);
  const treeCanvasRef = useRef(null);

  const API_BASE_URL = 'http://127.0.0.1:5000';

  const processDocumentWithAPI = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process document');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setIsProcessing(true);
    setProcessingError(null);
    setCompanies([]);
    setExtractedText('');

    try {
      const result = await processDocumentWithAPI(file);
      
      if (result.success && result.companies) {
        setCompanies(result.companies);
        setExtractedText(result.extracted_text || '');
        setActiveView('chart');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      setProcessingError(error.message || 'Failed to process document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleEdit = (company) => setEditingRow(company.id);
  const handleSave = (id, updatedData) => {
    setCompanies(companies.map(company => 
      company.id === id ? { ...company, ...updatedData } : company
    ));
    setEditingRow(null);
  };
  const handleDelete = (id) => setCompanies(companies.filter(company => company.id !== id));
  const handleAddCompany = () => {
    if (newCompany.name && newCompany.equity) {
      const newId = Math.max(...companies.map(c => c.id), 0) + 1;
      setCompanies([...companies, { id: newId, ...newCompany, level: newCompany.parent ? 1 : 0 }]);
      setNewCompany({ name: '', parent: '', equity: '' });
      setShowAddForm(false);
    }
  };

  const exportToPDF = () => window.print();
  const exportToCSV = () => {
    const csvContent = [
      ['Company Name', 'Parent Company', 'Equity'],
      ...companies.map(c => [c.name, c.parent, c.equity])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'company_structure.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const testWithSampleData = () => {
    const sampleData = [
      {"id": 1, "name": "Holding Company", "parent": "", "equity": "100%", "level": 0},
      {"id": 2, "name": "Securities Depository Center", "parent": "Holding Company", "equity": "100%", "level": 1},
      {"id": 3, "name": "Securities Clearing Center", "parent": "Holding Company", "equity": "100%", "level": 1},
      {"id": 4, "name": "Saudi Exchange Company", "parent": "Holding Company", "equity": "100%", "level": 1},
      {"id": 5, "name": "Tadawul Advance Solution", "parent": "Holding Company", "equity": "100%", "level": 1},
      {"id": 6, "name": "Direct Financial Network", "parent": "Holding Company", "equity": "51%", "level": 1},
      {"id": 7, "name": "DFN ME Dubai Center", "parent": "Direct Financial Network", "equity": "100%", "level": 2},
      {"id": 8, "name": "DFN Sri Lanka", "parent": "Direct Financial Network", "equity": "99%", "level": 2},
      {"id": 9, "name": "DFN Pakistan", "parent": "Direct Financial Network", "equity": "99%", "level": 2},
      {"id": 10, "name": "Real Estate Company", "parent": "Holding Company", "equity": "33.12%", "level": 1}
    ];
    setCompanies(sampleData);
    setActiveView('chart');
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setCompanies([]);
    setProcessingError(null);
    setExtractedText('');
    setActiveView('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildHierarchy = (companies) => {
    const hierarchy = {};
    const companyMap = {};
    
    companies.forEach(company => {
      companyMap[company.name] = { ...company, children: [] };
    });
    
    companies.forEach(company => {
      if (!company.parent || company.parent === '') {
        hierarchy[company.name] = companyMap[company.name];
      } else if (companyMap[company.parent]) {
        companyMap[company.parent].children.push(companyMap[company.name]);
      }
    });

    return hierarchy;
  };

  // Professional Chart Rendering with Gradients and Shadows
  const drawChart = useCallback(() => {
    if (!chartCanvasRef.current || companies.length === 0) return;
    
    const canvas = chartCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 700 * dpr;
    ctx.scale(dpr, dpr);
    
    // Set logical size
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '700px';
    
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const hierarchy = buildHierarchy(companies);
    const rootCompanies = Object.values(hierarchy);
    
    if (rootCompanies.length === 0) return;
    
    // Professional color palette
    const colors = {
      root: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '#5a67d8', text: '#ffffff' },
      level1: { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: '#e53e3e', text: '#ffffff' },
      level2: { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', border: '#3182ce', text: '#ffffff' },
      level3: { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', border: '#38a169', text: '#ffffff' },
      connection: '#cbd5e0'
    };
    
    // Calculate layout
    const levels = [];
    const calculateLevels = (companies, level = 0) => {
      if (!levels[level]) levels[level] = [];
      companies.forEach(company => {
        levels[level].push(company);
        if (company.children && company.children.length > 0) {
          calculateLevels(company.children, level + 1);
        }
      });
    };
    
    calculateLevels(rootCompanies);
    
    const levelHeight = 140;
    const nodeWidth = 200;
    const nodeHeight = 80;
    const startY = 60;
    const nodePositions = new Map();
    
    // Draw connections with curves
    const drawConnection = (from, to) => {
      const controlOffset = 40;
      ctx.strokeStyle = colors.connection;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(from.x, from.y + nodeHeight/2);
      
      // Curved connection
      const midY = from.y + (to.y - from.y) / 2;
      ctx.bezierCurveTo(
        from.x, from.y + controlOffset,
        to.x, to.y - controlOffset,
        to.x, to.y - nodeHeight/2
      );
      ctx.stroke();
    };
    
    // Draw nodes with professional styling
    levels.forEach((levelCompanies, levelIndex) => {
      const levelY = startY + levelIndex * levelHeight;
      const spacing = rect.width / (levelCompanies.length + 1);
      
      levelCompanies.forEach((company, companyIndex) => {
        const x = (companyIndex + 1) * spacing - nodeWidth / 2;
        const y = levelY;
        
        nodePositions.set(company.name, { x: x + nodeWidth / 2, y: y + nodeHeight / 2 });
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(x + 4, y + 4, nodeWidth, nodeHeight);
        
        // Create gradient
        const gradient = ctx.createLinearGradient(x, y, x + nodeWidth, y + nodeHeight);
        const colorKey = levelIndex === 0 ? 'root' : levelIndex === 1 ? 'level1' : levelIndex === 2 ? 'level2' : 'level3';
        
        if (colorKey === 'root') {
          gradient.addColorStop(0, '#667eea');
          gradient.addColorStop(1, '#764ba2');
        } else if (colorKey === 'level1') {
          gradient.addColorStop(0, '#f093fb');
          gradient.addColorStop(1, '#f5576c');
        } else if (colorKey === 'level2') {
          gradient.addColorStop(0, '#4facfe');
          gradient.addColorStop(1, '#00f2fe');
        } else {
          gradient.addColorStop(0, '#43e97b');
          gradient.addColorStop(1, '#38f9d7');
        }
        
        // Node background
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, nodeWidth, nodeHeight);
        
        // Border
        ctx.strokeStyle = colors[colorKey].border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, nodeWidth, nodeHeight);
        
        // Company icon
        ctx.fillStyle = colors[colorKey].text;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏢', x + nodeWidth / 2, y + 25);
        
        // Company name
        ctx.fillStyle = colors[colorKey].text;
        ctx.font = 'bold 13px Arial';
        const name = company.name.length > 20 ? company.name.substring(0, 18) + '...' : company.name;
        ctx.fillText(name, x + nodeWidth / 2, y + 45);
        
        // Equity with background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x + 10, y + 55, nodeWidth - 20, 18);
        ctx.fillStyle = colors[colorKey].text;
        ctx.font = 'bold 11px Arial';
        ctx.fillText(`Equity: ${company.equity}`, x + nodeWidth / 2, y + 67);
      });
    });
    
    // Draw connections
    levels.forEach((levelCompanies, levelIndex) => {
      if (levelIndex === 0) return;
      
      levelCompanies.forEach(company => {
        if (company.parent && nodePositions.has(company.parent) && nodePositions.has(company.name)) {
          const parentPos = nodePositions.get(company.parent);
          const childPos = nodePositions.get(company.name);
          drawConnection(parentPos, childPos);
        }
      });
    });
    
  }, [companies]);

  // Professional Tree View
  const drawTree = useCallback(() => {
    if (!treeCanvasRef.current || companies.length === 0) return;
    
    const canvas = treeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = Math.max(500, companies.length * 45 + 100) * dpr;
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = Math.max(500, companies.length * 45 + 100) + 'px';
    
    ctx.clearRect(0, 0, rect.width, canvas.height / dpr);
    
    const hierarchy = buildHierarchy(companies);
    let yPosition = 40;
    
    if (Object.keys(hierarchy).length === 0) return;
    
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#feca57'];
    
    const drawTreeNode = (company, level = 0, parentX = 0, parentY = 0) => {
      const x = 30 + level * 40;
      const y = yPosition;
      yPosition += 40;
      
      // Connection line
      if (level > 0 && parentX > 0 && parentY > 0) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(parentX + 15, parentY + 15);
        ctx.lineTo(x - 10, y + 15);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Node background with gradient
      const gradient = ctx.createLinearGradient(x, y, x + rect.width - x - 40, y + 30);
      gradient.addColorStop(0, colors[level % colors.length] + '20');
      gradient.addColorStop(1, colors[level % colors.length] + '05');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, rect.width - x - 40, 30);
      
      // Border
      ctx.strokeStyle = colors[level % colors.length];
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, rect.width - x - 40, 30);
      
      // Icon
      ctx.fillStyle = colors[level % colors.length];
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(level === 0 ? '🏛️' : level === 1 ? '🏢' : '🏬', x + 8, y + 20);
      
      // Company name
      ctx.fillStyle = '#2d3748';
      ctx.font = level === 0 ? 'bold 14px Arial' : '13px Arial';
      const displayName = company.name.length > 35 ? company.name.substring(0, 32) + '...' : company.name;
      ctx.fillText(displayName, x + 30, y + 20);
      
      // Equity badge
      ctx.fillStyle = colors[level % colors.length];
      ctx.fillRect(rect.width - 80, y + 5, 60, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(company.equity, rect.width - 50, y + 17);
      
      // Draw children
      if (company.children && company.children.length > 0) {
        company.children.forEach(child => {
          drawTreeNode(child, level + 1, x, y);
        });
      }
    };
    
    Object.values(hierarchy).forEach(company => {
      drawTreeNode(company);
    });
    
  }, [companies]);

  useEffect(() => {
    if (activeView === 'chart' && companies.length > 0) {
      const timer = setTimeout(drawChart, 300);
      return () => clearTimeout(timer);
    }
  }, [activeView, companies, drawChart]);

  useEffect(() => {
    if (activeView === 'tree' && companies.length > 0) {
      const timer = setTimeout(drawTree, 300);
      return () => clearTimeout(timer);
    }
  }, [activeView, companies, drawTree]);

  // Statistics
  const stats = {
    totalCompanies: companies.length,
    subsidiaries: companies.filter(c => c.parent).length,
    avgEquity: companies.length > 0 ? (companies.reduce((sum, c) => sum + parseFloat(c.equity.replace('%', '')), 0) / companies.length).toFixed(1) + '%' : '0%',
    levels: Math.max(...companies.map(c => c.level || 0)) + 1
  };

  const EditableRow = ({ company, isEditing, onEdit, onSave, onDelete, onCancel, parentCompanies }) => {
    const [editData, setEditData] = useState({
      name: company.name,
      parent: company.parent,
      equity: company.equity
    });

    if (isEditing) {
      return (
        <tr className="editing-row">
          <td className="table-cell">
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({...editData, name: e.target.value})}
              className="edit-input"
            />
          </td>
          <td className="table-cell">
            <select
              value={editData.parent}
              onChange={(e) => setEditData({...editData, parent: e.target.value})}
              className="edit-select"
            >
              <option value="">No Parent</option>
              {parentCompanies.filter(p => p !== '' && p !== company.name).map(parent => (
                <option key={parent} value={parent}>{parent}</option>
              ))}
            </select>
          </td>
          <td className="table-cell">
            <input
              type="text"
              value={editData.equity}
              onChange={(e) => setEditData({...editData, equity: e.target.value})}
              className="edit-input"
            />
          </td>
          <td className="table-cell">
            <div className="action-buttons">
              <button
                onClick={() => onSave(company.id, editData)}
                className="btn btn-save"
              >
                <Check className="icon" />
              </button>
              <button
                onClick={onCancel}
                className="btn btn-cancel"
              >
                <X className="icon" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr className="table-row">
        <td className="table-cell">
          <div className="company-info">
            <div className="company-avatar">
              <Building2 className="icon" />
            </div>
            <div className="company-details">
              <div className="company-name">{company.name}</div>
            </div>
          </div>
        </td>
        <td className="table-cell">
          {company.parent || <span className="badge badge-root">Root</span>}
        </td>
        <td className="table-cell">
          <span className="badge badge-equity">{company.equity}</span>
        </td>
        <td className="table-cell">
          <div className="action-buttons">
            <button
              onClick={() => onEdit(company)}
              className="btn btn-edit"
            >
              <Edit3 className="icon" />
              Edit
            </button>
            <button
              onClick={() => onDelete(company.id)}
              className="btn btn-delete"
            >
              <Trash2 className="icon" />
              Delete
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="app-container">
      <div className="main-wrapper">
        {/* Header */}
        <div className="header-section">
          <div className="header-card">
            <div className="header-content">
              <div className="header-text">
                <h1 className="main-title">
                  Company Structure Visualization
                </h1>
                <p className="main-subtitle">
                  AI-powered organizational chart analysis and visualization platform
                </p>
              </div>
              <div className="stats-section">
                <div className="stat-item">
                  <div className="stat-number stat-blue">{stats.totalCompanies}</div>
                  <div className="stat-label">Companies</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number stat-purple">{stats.subsidiaries}</div>
                  <div className="stat-label">Subsidiaries</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number stat-green">{stats.levels}</div>
                  <div className="stat-label">Levels</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="nav-section">
          <div className="nav-card">
            <div className="nav-buttons">
              <button
                onClick={() => setActiveView('upload')}
                className={`nav-btn ${activeView === 'upload' ? 'nav-btn-active nav-btn-blue' : 'nav-btn-inactive'}`}
              >
                <Upload className="icon" />
                Upload Document
              </button>
              
              <button
                onClick={() => setActiveView('chart')}
                disabled={companies.length === 0}
                className={`nav-btn ${activeView === 'chart' ? 'nav-btn-active nav-btn-green' : companies.length === 0 ? 'nav-btn-disabled' : 'nav-btn-inactive'}`}
              >
                <BarChart3 className="icon" />
                Organization Chart
              </button>
              
              <button
                onClick={() => setActiveView('tree')}
                disabled={companies.length === 0}
                className={`nav-btn ${activeView === 'tree' ? 'nav-btn-active nav-btn-purple' : companies.length === 0 ? 'nav-btn-disabled' : 'nav-btn-inactive'}`}
              >
                <Eye className="icon" />
                Tree Structure
              </button>
              
              <button
                onClick={() => setActiveView('table')}
                disabled={companies.length === 0}
                className={`nav-btn ${activeView === 'table' ? 'nav-btn-active nav-btn-orange' : companies.length === 0 ? 'nav-btn-disabled' : 'nav-btn-inactive'}`}
              >
                <FileText className="icon" />
                Data Table
              </button>

              {companies.length > 0 && (
                <div className="nav-actions">
                  <button onClick={resetUpload} className="btn btn-secondary">
                    <Upload className="icon" />
                    New Upload
                  </button>
                  <button onClick={exportToCSV} className="btn btn-success">
                    <Download className="icon" />
                    Export CSV
                  </button>
                  <button onClick={exportToPDF} className="btn btn-danger">
                    <Download className="icon" />
                    Export PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="content-section">
          {activeView === 'upload' && (
            <div className="content-card">
              <div className="upload-container">
                <div className="upload-icon-container">
                  <Upload className="upload-icon" />
                </div>
                <h3 className="upload-title">Upload Organization Structure</h3>
                <p className="upload-description">
                  Upload your PDF or image documents containing organizational charts. 
                  Our AI will automatically extract and analyze the company structure.
                </p>

                <div className="upload-dropzone">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="file-input"
                  />
                  <div className="upload-actions">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="btn btn-primary btn-large"
                    >
                      {isProcessing ? (
                        <>
                          <Loader className="icon animate-spin" />
                          Processing with AI...
                        </>
                      ) : (
                        <>
                          <Upload className="icon" />
                          Choose Document
                        </>
                      )}
                    </button>
                    
                    <div className="upload-divider">
                      <span>or</span>
                    </div>
                    
                    <button onClick={testWithSampleData} className="btn btn-secondary">
                      <TrendingUp className="icon" />
                      Load Sample Data
                    </button>
                  </div>
                </div>

                {uploadedFile && (
                  <div className="file-info-card">
                    <div className="file-info">
                      <FileText className="file-icon" />
                      <div className="file-details">
                        <p className="file-name">{uploadedFile.name}</p>
                        <p className="file-size">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="status-card status-processing">
                    <div className="status-content">
                      <Loader className="status-icon animate-spin" />
                      <div className="status-text">
                        <p className="status-title">Processing Document</p>
                        <p className="status-description">Analyzing structure with OpenAI GPT-4...</p>
                      </div>
                    </div>
                  </div>
                )}

                {processingError && (
                  <div className="status-card status-error">
                    <div className="status-content">
                      <AlertCircle className="status-icon" />
                      <div className="status-text">
                        <p className="status-title">Processing Error</p>
                        <p className="status-description">{processingError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {extractedText && (
                  <div className="status-card status-success">
                    <h4 className="status-title">Extracted Content Preview</h4>
                    <div className="extracted-text">{extractedText}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'chart' && companies.length > 0 && (
            <div className="content-card">
              <div className="chart-header">
                <h3 className="chart-title">Organization Chart</h3>
                <button onClick={drawChart} className="btn btn-secondary">
                  <Eye className="icon" />
                  Refresh Chart
                </button>
              </div>
              <div className="chart-container">
                <canvas 
                  ref={chartCanvasRef} 
                  className="chart-canvas"
                />
              </div>
              <p className="chart-description">
                Interactive organizational chart with professional styling and gradients
              </p>
            </div>
          )}

          {activeView === 'tree' && companies.length > 0 && (
            <div className="content-card">
              <div className="chart-header">
                <h3 className="chart-title">Tree Structure View</h3>
                <button onClick={drawTree} className="btn btn-secondary">
                  <Eye className="icon" />
                  Refresh Tree
                </button>
              </div>
              <div className="chart-container">
                <canvas 
                  ref={treeCanvasRef} 
                  className="tree-canvas"
                />
              </div>
              <p className="chart-description">
                Hierarchical tree structure with color-coded levels and professional styling
              </p>
            </div>
          )}

          {activeView === 'table' && companies.length > 0 && (
            <div className="content-card table-card">
              <div className="table-header">
                <div className="table-header-content">
                  <h3 className="table-title">Company Data Table</h3>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                  >
                    <Plus className="icon" />
                    Add Company
                  </button>
                </div>
              </div>

              {showAddForm && (
                <div className="add-form">
                  <div className="form-grid">
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                      className="form-input"
                    />
                    <select
                      value={newCompany.parent}
                      onChange={(e) => setNewCompany({...newCompany, parent: e.target.value})}
                      className="form-select"
                    >
                      <option value="">Select Parent (Optional)</option>
                      {companies.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Equity % (e.g., 100%)"
                      value={newCompany.equity}
                      onChange={(e) => setNewCompany({...newCompany, equity: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      onClick={handleAddCompany}
                      disabled={!newCompany.name || !newCompany.equity}
                      className="btn btn-success"
                    >
                      <Check className="icon" />
                      Add Company
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="btn btn-secondary"
                    >
                      <X className="icon" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="table-container">
                <table className="data-table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Company</th>
                      <th className="table-header-cell">Parent Company</th>
                      <th className="table-header-cell">Equity</th>
                      <th className="table-header-cell table-header-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {companies.map(company => (
                      <EditableRow
                        key={company.id}
                        company={company}
                        isEditing={editingRow === company.id}
                        onEdit={handleEdit}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        onCancel={() => setEditingRow(null)}
                        parentCompanies={['', ...companies.map(c => c.name)]}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView !== 'upload' && companies.length === 0 && (
            <div className="content-card empty-state">
              <div className="empty-icon-container">
                <FileText className="empty-icon" />
              </div>
              <h3 className="empty-title">No Data Available</h3>
              <p className="empty-description">
                Please upload a document or load sample data to view the organizational structure.
              </p>
              <button
                onClick={() => setActiveView('upload')}
                className="btn btn-primary btn-large"
              >
                <Upload className="icon" />
                Go to Upload
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyStructureTool;