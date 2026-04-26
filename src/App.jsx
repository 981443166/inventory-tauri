import { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RefreshCw,
  Trash2,
  X,
  Package,
  Minus,
  Square,
  Home,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  Phone,
  MapPin,
  Edit3,
  Eye,
  User,
  CheckCircle2,
  XCircle,
  CreditCard,
  Wallet,
  Receipt,
  FileText,
  AlertTriangle,
  ArrowRight,
  Download,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  FileSpreadsheet,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

const API_BASE = "http://localhost:3001/api";

// 窗口控制函数
const closeApp = () => invoke("close_window");
const minimizeApp = () => invoke("minimize_window");
const maximizeApp = () => invoke("maximize_window");

const App = () => {
  const [tab, setTab] = useState("home");
  const [productSubTab, setProductSubTab] = useState("list");

  // 商品数据
  const [products, setProducts] = useState([]);

  // 品牌、分类、单位
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  // 出入库记录
  const [inRecords, setInRecords] = useState([]);
  const [outRecords, setOutRecords] = useState([]);

  // 客户管理数据
  const [customers, setCustomers] = useState([]);
  const [customerSearchKey, setCustomerSearchKey] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    id: null,
    name: "",
    phone: "",
    debt: "",
    category: "普通客户",
    source: "线下门店",
    address: "",
  });
  const [customerModalMode, setCustomerModalMode] = useState("add"); // add | edit | view

  const customerCategories = ["普通客户", "VIP客户", "批发客户", "零售客户"];
  const customerSources = ["线下门店", "线上商城", "电话营销", "客户推荐", "社交媒体", "其他"];

  // 财务管理模块状态
  const [financeSubTab, setFinanceSubTab] = useState("overview"); // overview | reconciliation | debt
  const [financeSearchKey, setFinanceSearchKey] = useState("");
  const [financeFilterStatus, setFinanceFilterStatus] = useState("all"); // all | paid | unpaid | overdue
  const [financeSortField, setFinanceSortField] = useState("debtAmount");
  const [financeSortOrder, setFinanceSortOrder] = useState("desc"); // asc | desc
  const [financeCurrentPage, setFinanceCurrentPage] = useState(1);
  const [financePageSize, setFinancePageSize] = useState(10);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [reconciliationData, setReconciliationData] = useState([]);
  const [debtRecords, setDebtRecords] = useState([]);

  // 财务数据缓存
  const [financeCache, setFinanceCache] = useState({
    lastFetch: null,
    data: null,
  });

  // 初始化数据
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [
          productsRes,
          brandsRes,
          categoriesRes,
          unitsRes,
          inRecordsRes,
          outRecordsRes,
        ] = await Promise.all([
          fetch(`${API_BASE}/products`).then((r) => r.json()),
          fetch(`${API_BASE}/brands`).then((r) => r.json()),
          fetch(`${API_BASE}/categories`).then((r) => r.json()),
          fetch(`${API_BASE}/units`).then((r) => r.json()),
          fetch(`${API_BASE}/records?type=in`).then((r) => r.json()),
          fetch(`${API_BASE}/records?type=out`).then((r) => r.json()),
        ]);

        setProducts(productsRes);
        setBrands(brandsRes.map((b) => b.name));
        setCategories(categoriesRes.map((c) => c.name));
        setUnits(unitsRes.map((u) => u.name));
        // 修正时间字段映射
        setInRecords(inRecordsRes.map((r) => ({ ...r, time: r.createTime })));
        // 合并出库记录的本地扩展字段
        const savedOutExtras = localStorage.getItem("inventory_out_extras");
        const extrasMap = savedOutExtras ? JSON.parse(savedOutExtras) : {};
        setOutRecords(outRecordsRes.map((r) => ({
          ...r,
          time: r.createTime,
          recipientName: extrasMap[r.id]?.recipientName || r.recipientName || "",
          paymentStatus: extrasMap[r.id]?.paymentStatus || r.paymentStatus || "unpaid",
        })));

        // 加载客户数据（使用本地存储模拟）
        const savedCustomers = localStorage.getItem("inventory_customers");
        let loadedCustomers = [];
        if (savedCustomers) {
          loadedCustomers = JSON.parse(savedCustomers);
          setCustomers(loadedCustomers);
        }

        // 加载财务数据
        loadFinanceData(loadedCustomers, outRecsRes);
      } catch (error) {
        console.error("加载数据失败:", error);
        alert('请求异常: ' + error.message);
      } 
    };
    fetchInitialData();
  }, []);

  // 加载财务数据
  const loadFinanceData = (customerList, outRecordsList) => {
    setFinanceLoading(true);
    
    // 模拟财务对账数据
    const mockReconciliation = customerList.map((customer, index) => {
      const customerOutRecords = outRecordsList.filter(
        (r) => r.recipientName === customer.name
      );
      const totalAmount = customerOutRecords.reduce((sum, r) => {
        const product = products.find((p) => p.id === r.productId);
        return sum + (product ? product.price * Math.abs(r.quantity) : 0);
      }, 0);
      
      const paidAmount = customerOutRecords
        .filter((r) => r.paymentStatus === "paid")
        .reduce((sum, r) => {
          const product = products.find((p) => p.id === r.productId);
          return sum + (product ? product.price * Math.abs(r.quantity) : 0);
        }, 0);

      const unpaidAmount = totalAmount - paidAmount;
      const lastTransactionDate = customerOutRecords.length > 0 
        ? customerOutRecords[customerOutRecords.length - 1].createTime 
        : new Date().toISOString().split('T')[0];

      return {
        id: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        unpaidAmount: unpaidAmount + Number(customer.debt || 0),
        lastTransactionDate: lastTransactionDate,
        transactionCount: customerOutRecords.length,
        status: unpaidAmount > 0 ? "unpaid" : "paid",
        overdueDays: unpaidAmount > 0 ? Math.floor(Math.random() * 30) + 1 : 0,
        category: customer.category,
      };
    }).filter(r => r.transactionCount > 0 || r.unpaidAmount > 0);

    // 模拟欠款记录
    const mockDebtRecords = customerList
      .filter((c) => Number(c.debt || 0) > 0)
      .map((customer) => ({
        id: Date.now() + Math.random(),
        customerName: customer.name,
        customerPhone: customer.phone,
        debtAmount: Number(customer.debt),
        debtDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: Math.random() > 0.5 ? "overdue" : "unpaid",
        overdueDays: Math.floor(Math.random() * 15) + 1,
        category: customer.category,
        remark: "历史欠款",
      }));

    setReconciliationData(mockReconciliation);
    setDebtRecords(mockDebtRecords);
    setFinanceCache({
      lastFetch: Date.now(),
      data: { reconciliation: mockReconciliation, debts: mockDebtRecords },
    });
    
    setTimeout(() => setFinanceLoading(false), 300);
  };

  // 刷新财务数据
  const refreshFinanceData = () => {
    loadFinanceData(customers, outRecords);
  };

  // 商品管理相关状态
  const [pname, setPname] = useState("");
  const [pprice, setPprice] = useState("");
  const [pcategory, setPcategory] = useState("办公用品");
  const [showProductModal, setShowProductModal] = useState(false);

  // 品牌/分类/单位输入
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");

  // 出入库弹窗状态
  const [showInModal, setShowInModal] = useState(false);
  const [showOutModal, setShowOutModal] = useState(false);
  const [inForm, setInForm] = useState({
    productId: "",
    quantity: "",
    remark: "",
  });
  const [outForm, setOutForm] = useState({
    productId: "",
    quantity: "",
    remark: "",
    recipientId: "",
    recipientName: "",
    paymentStatus: "unpaid",
  });

  // 可搜索下拉相关状态
  const [inSearchText, setInSearchText] = useState("");
  const [inDropdownOpen, setInDropdownOpen] = useState(false);
  const [outSearchText, setOutSearchText] = useState("");
  const [outDropdownOpen, setOutDropdownOpen] = useState(false);

  // 出库 - 接收方相关状态
  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false);
  const [recipientSearchText, setRecipientSearchText] = useState("");
  const recipientDropdownRef = useRef(null);

  // 首页图表 tooltip 状态
  const [chartTooltip, setChartTooltip] = useState({ show: false, x: 0, y: 0, text: "" });
  const inDropdownRef = useRef(null);
  const outDropdownRef = useRef(null);

  const [searchKey, setSearchKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [tab, productSubTab]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inDropdownRef.current &&
        !inDropdownRef.current.contains(event.target)
      ) {
        setInDropdownOpen(false);
      }
      if (
        outDropdownRef.current &&
        !outDropdownRef.current.contains(event.target)
      ) {
        setOutDropdownOpen(false);
      }
      if (
        recipientDropdownRef.current &&
        !recipientDropdownRef.current.contains(event.target)
      ) {
        setRecipientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 筛选商品（库存查询用）
  const filteredProducts = products.filter(
    (item) =>
      item.name.includes(searchKey) ||
      item.category.includes(searchKey) ||
      item.id.toString().includes(searchKey),
  );

  // 过滤商品用于下拉
  const filteredInProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(inSearchText.toLowerCase()) ||
      p.id.toString().includes(inSearchText),
  );
  const filteredOutProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(outSearchText.toLowerCase()) ||
      p.id.toString().includes(outSearchText),
  );

  // 过滤客户用于接收方下拉
  const filteredRecipients = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(recipientSearchText.toLowerCase()) ||
      c.phone.includes(recipientSearchText),
  );

  // ---------- 商品管理 ----------
  const openAddProductModal = () => {
    setPname("");
    setPprice("");
    setPcategory(categories[0] || "办公用品");
    setShowProductModal(true);
  };

  const addProduct = async () => {
    if (!pname || !pprice) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pname,
          price: Number(pprice),
          category: pcategory,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "添加失败");
        return;
      }
      const newProducts = await fetch(`${API_BASE}/products`).then((r) =>
        r.json(),
      );
      setProducts(newProducts);
      setShowProductModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("确认删除该商品？")) return;
    setLoading(true);
    await fetch(`${API_BASE}/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setLoading(false);
  };

  // ---------- 品牌/分类/单位管理 ----------
  const addBrand = async () => {
    if (!newBrand.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrand.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "添加失败");
        return;
      }
      const data = await fetch(`${API_BASE}/brands`).then((r) => r.json());
      setBrands(data.map((b) => b.name));
      setNewBrand("");
    } catch (e) {
      console.error("添加品牌失败", e);
    }
  };

  const deleteBrand = async (index) => {
    if (!window.confirm("确认删除该品牌？")) return;
    const brandsData = await fetch(`${API_BASE}/brands`).then((r) => r.json());
    const brandToDelete = brandsData[index];
    if (!brandToDelete) return;
    await fetch(`${API_BASE}/brands/${brandToDelete.id}`, { method: "DELETE" });
    const updated = await fetch(`${API_BASE}/brands`).then((r) => r.json());
    setBrands(updated.map((b) => b.name));
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "添加失败");
        return;
      }
      const data = await fetch(`${API_BASE}/categories`).then((r) => r.json());
      setCategories(data.map((c) => c.name));
      setNewCategory("");
    } catch (e) {
      console.error("添加分类失败", e);
    }
  };

  const deleteCategory = async (index) => {
    if (!window.confirm("确认删除该分类？")) return;
    const catData = await fetch(`${API_BASE}/categories`).then((r) => r.json());
    const catToDelete = catData[index];
    if (!catToDelete) return;
    await fetch(`${API_BASE}/categories/${catToDelete.id}`, {
      method: "DELETE",
    });
    const updated = await fetch(`${API_BASE}/categories`).then((r) => r.json());
    setCategories(updated.map((c) => c.name));
  };

  const addUnit = async () => {
    if (!newUnit.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUnit.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "添加失败");
        return;
      }
      const data = await fetch(`${API_BASE}/units`).then((r) => r.json());
      setUnits(data.map((u) => u.name));
      setNewUnit("");
    } catch (e) {
      console.error("添加单位失败", e);
    }
  };

  const deleteUnit = async (index) => {
    if (!window.confirm("确认删除该单位？")) return;
    const unitData = await fetch(`${API_BASE}/units`).then((r) => r.json());
    const unitToDelete = unitData[index];
    if (!unitToDelete) return;
    await fetch(`${API_BASE}/units/${unitToDelete.id}`, { method: "DELETE" });
    const updated = await fetch(`${API_BASE}/units`).then((r) => r.json());
    setUnits(updated.map((u) => u.name));
  };

  // ---------- 入库 ----------
  const openInModal = () => {
    setInForm({ productId: "", quantity: "", remark: "" });
    setInSearchText("");
    setInDropdownOpen(false);
    setShowInModal(true);
  };

  const doIn = async () => {
    const id = parseInt(inForm.productId);
    const num = parseInt(inForm.quantity);
    if (isNaN(id) || isNaN(num) || num <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          quantity: num,
          remark: inForm.remark,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      const [productsRes, inRecsRes] = await Promise.all([
        fetch(`${API_BASE}/products`).then((r) => r.json()),
        fetch(`${API_BASE}/records?type=in`).then((r) => r.json()),
      ]);
      setProducts(productsRes);
      setInRecords(inRecsRes.map((r) => ({ ...r, time: r.createTime })));
      setShowInModal(false);
      setInForm({ productId: "", quantity: "", remark: "" });
      setInSearchText("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 切换出库记录付款状态
  const togglePaymentStatus = (recordId) => {
    const updated = outRecords.map((r) => {
      if (r.id === recordId) {
        const newStatus = r.paymentStatus === "paid" ? "unpaid" : "paid";
        return { ...r, paymentStatus: newStatus };
      }
      return r;
    });
    setOutRecords(updated);
    // 同步扩展字段到 localStorage
    const savedOutExtras = localStorage.getItem("inventory_out_extras");
    const extrasMap = savedOutExtras ? JSON.parse(savedOutExtras) : {};
    const targetRecord = updated.find((r) => r.id === recordId);
    if (targetRecord) {
      extrasMap[recordId] = {
        recipientName: targetRecord.recipientName,
        paymentStatus: targetRecord.paymentStatus,
      };
      localStorage.setItem("inventory_out_extras", JSON.stringify(extrasMap));
    }
  };

  // ---------- 出库 ----------
  const openOutModal = () => {
    setOutForm({ productId: "", quantity: "", remark: "", recipientId: "", recipientName: "", paymentStatus: "unpaid" });
    setOutSearchText("");
    setOutDropdownOpen(false);
    setRecipientSearchText("");
    setRecipientDropdownOpen(false);
    setShowOutModal(true);
  };

  const doOut = async () => {
    const id = parseInt(outForm.productId);
    const num = parseInt(outForm.quantity);
    if (isNaN(id) || isNaN(num) || num <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          quantity: -num,
          remark: outForm.remark,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      const [productsRes, outRecsRes] = await Promise.all([
        fetch(`${API_BASE}/products`).then((r) => r.json()),
        fetch(`${API_BASE}/records?type=out`).then((r) => r.json()),
      ]);
      setProducts(productsRes);
      // 合并后端数据和本地存储的扩展字段（recipientName, paymentStatus）
      const savedOutExtras = localStorage.getItem("inventory_out_extras");
      const extrasMap = savedOutExtras ? JSON.parse(savedOutExtras) : {};

      // 保存当前新记录的扩展字段
      const result = outRecsRes[outRecsRes.length - 1];
      if (result) {
        extrasMap[result.id] = {
          recipientName: outForm.recipientName,
          paymentStatus: outForm.paymentStatus,
        };
        localStorage.setItem("inventory_out_extras", JSON.stringify(extrasMap));
      }

      setOutRecords(outRecsRes.map((r) => ({
        ...r,
        time: r.createTime,
        recipientName: extrasMap[r.id]?.recipientName || r.recipientName || "",
        paymentStatus: extrasMap[r.id]?.paymentStatus || r.paymentStatus || "unpaid",
      })));
      setShowOutModal(false);
      setOutForm({ productId: "", quantity: "", remark: "", recipientId: "", recipientName: "", paymentStatus: "unpaid" });
      setOutSearchText("");
      setRecipientSearchText("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ---------- 重置 ----------
  const resetPage = () => {
    setLoading(true);
    setSearchKey("");
    if (tab === "products") {
      setPname("");
      setPprice("");
      setPcategory(categories[0] || "办公用品");
      setShowProductModal(false);
      setProductSubTab("list");
    } else if (tab === "in") {
      setShowInModal(false);
      setInForm({ productId: "", quantity: "", remark: "" });
      setInSearchText("");
    } else if (tab === "out") {
      setShowOutModal(false);
      setOutForm({ productId: "", quantity: "", remark: "", recipientId: "", recipientName: "", paymentStatus: "unpaid" });
      setOutSearchText("");
      setRecipientSearchText("");
    } else if (tab === "customers") {
      setShowCustomerModal(false);
      setCustomerSearchKey("");
    }
    setTimeout(() => setLoading(false), 500);
  };

  const menuList = [
    { name: "数据概览", key: "home", icon: <Home size={18} /> },
    { name: "客户管理", key: "customers", icon: <Users size={18} /> },
    { name: "财务管理", key: "finance", icon: <Receipt size={18} /> },
    { name: "库存查询", key: "stock", icon: <Search size={18} /> },
    { name: "商品管理", key: "products", icon: <Package size={18} /> },
    { name: "入库管理", key: "in", icon: <ArrowUpRight size={18} /> },
    { name: "出库管理", key: "out", icon: <ArrowDownRight size={18} /> },
  ];
  const currentMenu = menuList.find((m) => m.key === tab);

  const subTabs = [
    { name: "商品列表", key: "list" },
    { name: "品牌管理", key: "brand" },
    { name: "商品分类", key: "category" },
    { name: "单位管理", key: "unit" },
  ];

  const financeSubTabs = [
    { name: "对账汇总", key: "overview" },
    { name: "客户对账", key: "reconciliation" },
    { name: "欠款管理", key: "debt" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-200/50">
      {/* 自定义标题栏 */}
      <div
        data-tauri-drag-region
        className="fixed top-0 left-0 right-0 h-9 bg-white/80 backdrop-blur-md border-b border-gray-200/50 z-[100] flex items-center justify-between px-4 rounded-t-xl"
        style={{ WebkitAppRegion: "drag" }}
      >
        <div className="flex items-center gap-2">
          <Package size={14} className="text-blue-600" />
          <span className="text-xs font-medium text-gray-700">极简进销存系统</span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
          <button
            onClick={minimizeApp}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={maximizeApp}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Square size={12} />
          </button>
          <button
            onClick={closeApp}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 hover:text-red-500 text-gray-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 侧边栏 */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col pt-9">
        <div className="px-5 py-4 border-b border-gray-200">
          <h1 className="text-base font-bold text-gray-800">极简进销存</h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuList.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setTab(item.key);
                setLoading(true);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                tab === item.key
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              {item.icon}
              {item.name}
            </button>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-gray-200 text-xs text-gray-400">
          <p>v1.0.0</p>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden pt-9">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>首页</span>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="font-medium text-gray-800">
              {currentMenu?.name}
            </span>
            {tab === "products" && productSubTab !== "list" && (
              <>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="font-medium text-gray-800">
                  {productSubTab === "brand"
                    ? "品牌管理"
                    : productSubTab === "category"
                      ? "商品分类"
                      : "单位管理"}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tab === "home" && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索商品"
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}
            {tab === "stock" && (
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="搜索商品"
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}
            <button
              onClick={resetPage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw size={14} /> 重置
            </button>
          </div>
        </header>

        {tab === "products" && (
          <div className="bg-white border-b border-gray-200 px-6 py-0 flex space-x-1">
            {subTabs.map((sub) => (
              <button
                key={sub.key}
                onClick={() => {
                  setProductSubTab(sub.key);
                  setLoading(true);
                }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  productSubTab === sub.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {tab === "finance" && (
          <div className="bg-white border-b border-gray-200 px-6 py-0 flex space-x-1">
            {financeSubTabs.map((sub) => (
              <button
                key={sub.key}
                onClick={() => {
                  setFinanceSubTab(sub.key);
                  setFinanceLoading(true);
                  setTimeout(() => setFinanceLoading(false), 300);
                }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  financeSubTab === sub.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                {tab === "home"
                  ? "首页概览"
                  : tab === "products"
                    ? productSubTab === "list"
                      ? "商品列表"
                      : productSubTab === "brand"
                        ? "品牌管理"
                        : productSubTab === "category"
                          ? "商品分类"
                          : "单位管理"
                    : tab === "finance"
                      ? financeSubTab === "overview"
                        ? "对账汇总"
                        : financeSubTab === "reconciliation"
                          ? "客户对账"
                          : "欠款管理"
                      : currentMenu?.name}
              </h2>
              <div className="flex gap-2">
                {tab === "products" && productSubTab === "list" && (
                  <button
                    onClick={openAddProductModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <PlusCircle size={16} /> 添加商品
                  </button>
                )}
                {tab === "in" && (
                  <button
                    onClick={openInModal}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <ArrowUpRight size={16} /> 新入库
                  </button>
                )}
                {tab === "out" && (
                  <button
                    onClick={openOutModal}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors flex items-center gap-2"
                  >
                    <ArrowDownRight size={16} /> 新出库
                  </button>
                )}
                {tab === "finance" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshFinanceData}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <RefreshCw size={14} /> 刷新数据
                    </button>
                    <button
                      onClick={() => {
                        // 导出数据功能
                        const data = financeSubTab === "debt" ? debtRecords : reconciliationData;
                        const csv = convertToCSV(data);
                        downloadCSV(csv, `财务数据_${financeSubTab}_${new Date().toISOString().split('T')[0]}.csv`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Download size={14} /> 导出
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              {loading || financeLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <RefreshCw size={24} className="animate-spin mr-2" />{" "}
                  加载中...
                </div>
              ) : (
                <>
                  {tab === "finance" && (
                    <FinanceModule
                      financeSubTab={financeSubTab}
                      reconciliationData={reconciliationData}
                      debtRecords={debtRecords}
                      financeSearchKey={financeSearchKey}
                      setFinanceSearchKey={setFinanceSearchKey}
                      financeFilterStatus={financeFilterStatus}
                      setFinanceFilterStatus={setFinanceFilterStatus}
                      financeSortField={financeSortField}
                      setFinanceSortField={setFinanceSortField}
                      financeSortOrder={financeSortOrder}
                      setFinanceSortOrder={setFinanceSortOrder}
                      financeCurrentPage={financeCurrentPage}
                      setFinanceCurrentPage={setFinanceCurrentPage}
                      financePageSize={financePageSize}
                      setFinancePageSize={setFinancePageSize}
                      selectedCustomerDetail={selectedCustomerDetail}
                      setSelectedCustomerDetail={setSelectedCustomerDetail}
                      showCustomerDetailModal={showCustomerDetailModal}
                      setShowCustomerDetailModal={setShowCustomerDetailModal}
                      customers={customers}
                      outRecords={outRecords}
                      products={products}
                    />
                  )}

                  {tab === "customers" && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                        <div className="relative w-full sm:w-80">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="搜索客户名称、手机号"
                            value={customerSearchKey}
                            onChange={(e) => setCustomerSearchKey(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setCustomerModalMode("add");
                            setCustomerForm({
                              id: null,
                              name: "",
                              phone: "",
                              debt: "",
                              category: "普通客户",
                              source: "线下门店",
                              address: "",
                            });
                            setShowCustomerModal(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <PlusCircle size={16} /> 新增客户
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-gray-600">
                              <th className="px-4 py-3 text-left font-medium rounded-tl-lg">客户名称</th>
                              <th className="px-4 py-3 text-left font-medium">手机号</th>
                              <th className="px-4 py-3 text-left font-medium">欠款金额</th>
                              <th className="px-4 py-3 text-left font-medium">客户分类</th>
                              <th className="px-4 py-3 text-left font-medium">来源方式</th>
                              <th className="px-4 py-3 text-right font-medium rounded-tr-lg">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customers
                              .filter(
                                (c) =>
                                  c.name.includes(customerSearchKey) ||
                                  c.phone.includes(customerSearchKey),
                              )
                              .map((c) => (
                                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium">{c.name}</td>
                                  <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                                  <td className="px-4 py-3">
                                    <span className={Number(c.debt) > 0 ? "text-red-500 font-medium" : "text-gray-700"}>
                                      ¥{Number(c.debt).toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      c.category === "VIP客户"
                                        ? "bg-purple-100 text-purple-700"
                                        : c.category === "批发客户"
                                          ? "bg-blue-100 text-blue-700"
                                          : c.category === "零售客户"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-700"
                                    }`}>
                                      {c.category}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-gray-500">{c.source}</td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setCustomerModalMode("view");
                                          setCustomerForm({ ...c });
                                          setShowCustomerModal(true);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                                        title="查看详情"
                                      >
                                        <Eye size={16} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setCustomerModalMode("edit");
                                          setCustomerForm({ ...c });
                                          setShowCustomerModal(true);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                                        title="编辑"
                                      >
                                        <Edit3 size={16} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`确认删除客户 "${c.name}"？`)) {
                                            const updated = customers.filter((x) => x.id !== c.id);
                                            setCustomers(updated);
                                            localStorage.setItem("inventory_customers", JSON.stringify(updated));
                                          }
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                        title="删除"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            {customers.filter(
                              (c) =>
                                c.name.includes(customerSearchKey) ||
                                c.phone.includes(customerSearchKey),
                            ).length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                  暂无客户，请点击右上角添加
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {tab === "home" && (
                    <div className="space-y-6">
                      {/* 统计卡片 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-blue-600 font-medium">库存总价值</p>
                              <p className="text-2xl font-bold text-gray-800 mt-1">
                                ¥{products.reduce((sum, p) => sum + p.price * p.stock, 0).toFixed(2)}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                              <DollarSign size={24} />
                            </div>
                          </div>
                          <p className="text-xs text-blue-500 mt-2">基于当前库存与单价计算</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-600 font-medium">本月入库总量</p>
                              <p className="text-2xl font-bold text-gray-800 mt-1">
                                {inRecords.reduce((sum, r) => sum + r.quantity, 0)} 件
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white">
                              <TrendingUp size={24} />
                            </div>
                          </div>
                          <p className="text-xs text-green-500 mt-2">{inRecords.length} 笔入库记录</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-orange-600 font-medium">本月出库总量</p>
                              <p className="text-2xl font-bold text-gray-800 mt-1">
                                {outRecords.reduce((sum, r) => sum + Math.abs(r.quantity), 0)} 件
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                              <TrendingDown size={24} />
                            </div>
                          </div>
                          <p className="text-xs text-orange-500 mt-2">{outRecords.length} 笔出库记录</p>
                        </div>
                      </div>

                      {/* 出入库数据面板 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 库存周转率 */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <BarChart3 size={18} className="text-blue-600" />
                            <h3 className="font-semibold text-gray-800">库存周转概览</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-600">总商品种类</span>
                              <span className="text-lg font-bold text-gray-800">{products.length} 种</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-600">库存总量</span>
                              <span className="text-lg font-bold text-gray-800">
                                {products.reduce((sum, p) => sum + p.stock, 0)} 件
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-600">平均单价</span>
                              <span className="text-lg font-bold text-gray-800">
                                ¥{products.length > 0 ? (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2) : "0.00"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-600">缺货商品</span>
                              <span className="text-lg font-bold text-red-500">
                                {products.filter((p) => p.stock === 0).length} 种
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 库存状态分布 */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <Package size={18} className="text-purple-600" />
                            <h3 className="font-semibold text-gray-800">库存状态分布</h3>
                          </div>
                          <div className="space-y-3">
                            {(() => {
                              const total = products.reduce((sum, p) => sum + p.stock, 0) || 1;
                              const categories = {};
                              products.forEach((p) => {
                                categories[p.category] = (categories[p.category] || 0) + p.stock;
                              });
                              return Object.entries(categories)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 6)
                                .map(([cat, count], i) => {
                                  const pct = (count / total) * 100;
                                  const colors = ["bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500"];
                                  return (
                                    <div key={cat}>
                                      <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-700">{cat}</span>
                                        <span className="text-gray-500">{count} 件 ({pct.toFixed(1)}%)</span>
                                      </div>
                                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                                        <div
                                          className={`${colors[i % colors.length]} h-2.5 rounded-full transition-all duration-500`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                });
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* 库存变动趋势 */}
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp size={18} className="text-green-600" />
                          <h3 className="font-semibold text-gray-800">库存变动趋势</h3>
                        </div>
                        <div className="h-64 flex items-end gap-2 px-4">
                          {(() => {
                            const days = 7;
                            const data = [];
                            for (let i = days - 1; i >= 0; i--) {
                              const d = new Date();
                              d.setDate(d.getDate() - i);
                              const dateStr = d.toISOString().split("T")[0];
                              const dayIn = inRecords
                                .filter((r) => r.time && r.time.startsWith(dateStr))
                                .reduce((sum, r) => sum + r.quantity, 0);
                              const dayOut = outRecords
                                .filter((r) => r.time && r.time.startsWith(dateStr))
                                .reduce((sum, r) => sum + Math.abs(r.quantity), 0);
                              data.push({ date: dateStr.slice(5), in: dayIn, out: dayOut });
                            }
                            const maxVal = Math.max(...data.map((d) => Math.max(d.in, d.out)), 1);
                            return (
                              <>
                                {data.map((d, i) => (
                                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full flex gap-0.5 items-end justify-center relative" style={{ height: "180px" }}>
                                      <div
                                        className="w-full max-w-[20px] bg-green-400 rounded-t transition-all duration-500 hover:bg-green-500 cursor-pointer relative group"
                                        style={{ height: `${(d.in / maxVal) * 100}%`, minHeight: d.in > 0 ? "4px" : "0" }}
                                      >
                                        {d.in > 0 && (
                                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap pointer-events-none z-10 shadow-sm">
                                            {d.in}
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className="w-full max-w-[20px] bg-orange-400 rounded-t transition-all duration-500 hover:bg-orange-500 cursor-pointer relative group"
                                        style={{ height: `${(d.out / maxVal) * 100}%`, minHeight: d.out > 0 ? "4px" : "0" }}
                                      >
                                        {d.out > 0 && (
                                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap pointer-events-none z-10 shadow-sm">
                                            {d.out}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-xs text-gray-500">{d.date}</span>
                                  </div>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-400 rounded" />
                            <span className="text-sm text-gray-600">入库量</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-400 rounded" />
                            <span className="text-sm text-gray-600">出库量</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "stock" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600">
                            <th className="px-4 py-3 text-left font-medium rounded-tl-lg">ID</th>
                            <th className="px-4 py-3 text-left font-medium">商品名称</th>
                            <th className="px-4 py-3 text-left font-medium">分类</th>
                            <th className="px-4 py-3 text-left font-medium">单价</th>
                            <th className="px-4 py-3 text-left font-medium">库存</th>
                            <th className="px-4 py-3 text-left font-medium rounded-tr-lg">更新时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((p) => (
                              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-500">{p.id}</td>
                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                <td className="px-4 py-3 text-gray-500">{p.category}</td>
                                <td className="px-4 py-3">¥{p.price.toFixed(2)}</td>
                                <td className="px-4 py-3">
                                  {p.stock > 50 ? (
                                    <span className="text-green-600 font-medium">{p.stock}</span>
                                  ) : p.stock > 0 ? (
                                    <span className="text-orange-500 font-medium">{p.stock}</span>
                                  ) : (
                                    <span className="text-red-500 font-medium">缺货</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-400">{p.updateTime}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                暂无商品
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {tab === "products" && (
                    <>
                      {productSubTab === "list" && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-gray-600">
                                <th className="px-4 py-3 text-left font-medium rounded-tl-lg">ID</th>
                                <th className="px-4 py-3 text-left font-medium">商品名称</th>
                                <th className="px-4 py-3 text-left font-medium">分类</th>
                                <th className="px-4 py-3 text-left font-medium">单价</th>
                                <th className="px-4 py-3 text-left font-medium">更新时间</th>
                                <th className="px-4 py-3 text-right font-medium rounded-tr-lg">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {products.length > 0 ? (
                                products.map((p) => (
                                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-500">{p.id}</td>
                                    <td className="px-4 py-3 font-medium">{p.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{p.category}</td>
                                    <td className="px-4 py-3">¥{p.price.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-gray-400">{p.updateTime}</td>
                                    <td className="px-4 py-3 text-right">
                                      <button
                                        onClick={() => deleteProduct(p.id)}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    暂无商品，请点击右上角添加
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {productSubTab === "brand" && (
                        <div className="max-w-md space-y-4">
                          <div className="flex gap-2">
                            <input
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                              value={newBrand}
                              onChange={(e) => setNewBrand(e.target.value)}
                              placeholder="输入品牌名称"
                              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <button
                              type="button"
                              onClick={addBrand}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                            >
                              <PlusCircle size={16} /> 添加
                            </button>
                          </div>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <tbody>
                                {brands.length > 0 ? (
                                  brands.map((b, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                      <td className="px-4 py-3">{b}</td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => deleteBrand(i)}
                                          className="text-gray-400 hover:text-red-500"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                                      暂无品牌
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {productSubTab === "category" && (
                        <div className="max-w-md space-y-4">
                          <div className="flex gap-2">
                            <input
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              placeholder="输入分类名称"
                              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <button
                              type="button"
                              onClick={addCategory}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                            >
                              <PlusCircle size={16} /> 添加
                            </button>
                          </div>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <tbody>
                                {categories.length > 0 ? (
                                  categories.map((c, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                      <td className="px-4 py-3">{c}</td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => deleteCategory(i)}
                                          className="text-gray-400 hover:text-red-500"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                                      暂无分类
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {productSubTab === "unit" && (
                        <div className="max-w-md space-y-4">
                          <div className="flex gap-2">
                            <input
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                              value={newUnit}
                              onChange={(e) => setNewUnit(e.target.value)}
                              placeholder="输入单位名称"
                              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <button
                              type="button"
                              onClick={addUnit}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                            >
                              <PlusCircle size={16} /> 添加
                            </button>
                          </div>
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <tbody>
                                {units.length > 0 ? (
                                  units.map((u, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                      <td className="px-4 py-3">{u}</td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => deleteUnit(i)}
                                          className="text-gray-400 hover:text-red-500"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                                      暂无单位
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {tab === "in" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600">
                            <th className="px-4 py-3 text-left font-medium rounded-tl-lg">商品ID</th>
                            <th className="px-4 py-3 text-left font-medium">商品名称</th>
                            <th className="px-4 py-3 text-left font-medium">数量</th>
                            <th className="px-4 py-3 text-left font-medium">备注</th>
                            <th className="px-4 py-3 text-left font-medium rounded-tr-lg">时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inRecords.length > 0 ? (
                            inRecords.map((r) => (
                              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-500">{r.productId}</td>
                                <td className="px-4 py-3 font-medium">{r.productName}</td>
                                <td className="px-4 py-3 text-green-600 font-medium">+{r.quantity}</td>
                                <td className="px-4 py-3 text-gray-500">{r.remark || "-"}</td>
                                <td className="px-4 py-3 text-gray-400">{r.time}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                暂无入库记录
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {tab === "out" && (
                    <div className="space-y-4">
                      {/* 出库统计卡片 */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
                          <div className="flex items-center gap-2">
                            <ArrowDownRight size={18} className="text-orange-600" />
                            <span className="text-sm text-orange-600 font-medium">出库总笔数</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-800 mt-1">{outRecords.length} 笔</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-green-600" />
                            <span className="text-sm text-green-600 font-medium">已付款</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-800 mt-1">
                            {outRecords.filter((r) => r.paymentStatus === "paid").length} 笔
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                          <div className="flex items-center gap-2">
                            <XCircle size={18} className="text-red-600" />
                            <span className="text-sm text-red-600 font-medium">未付款</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-800 mt-1">
                            {outRecords.filter((r) => r.paymentStatus === "unpaid" || !r.paymentStatus).length} 笔
                          </p>
                        </div>
                      </div>

                      {/* 筛选器 */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative w-full sm:w-64">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="搜索接收方名称"
                            value={recipientSearchText}
                            onChange={(e) => setRecipientSearchText(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                        <select
                          value={outForm.paymentStatus || "all"}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOutForm({ ...outForm, paymentStatus: val });
                          }}
                          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="all">全部付款状态</option>
                          <option value="paid">已付款</option>
                          <option value="unpaid">未付款</option>
                        </select>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-gray-600">
                              <th className="px-4 py-3 text-left font-medium rounded-tl-lg">商品ID</th>
                              <th className="px-4 py-3 text-left font-medium">商品名称</th>
                              <th className="px-4 py-3 text-left font-medium">数量</th>
                              <th className="px-4 py-3 text-left font-medium">接收方</th>
                              <th className="px-4 py-3 text-left font-medium">付款状态</th>
                              <th className="px-4 py-3 text-left font-medium">备注</th>
                              <th className="px-4 py-3 text-left font-medium rounded-tr-lg">时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {outRecords
                              .filter((r) => {
                                const matchRecipient = !recipientSearchText ||
                                  (r.recipientName && r.recipientName.includes(recipientSearchText));
                                const matchPayment = outForm.paymentStatus === "all" ||
                                  !outForm.paymentStatus ||
                                  (r.paymentStatus || "unpaid") === outForm.paymentStatus;
                                return matchRecipient && matchPayment;
                              })
                              .map((r) => (
                                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-4 py-3 text-gray-500">{r.productId}</td>
                                  <td className="px-4 py-3 font-medium">{r.productName}</td>
                                  <td className="px-4 py-3 text-red-500 font-medium">-{Math.abs(r.quantity)}</td>
                                  <td className="px-4 py-3">
                                    {r.recipientName ? (
                                      <div className="flex items-center gap-1.5">
                                        <User size={14} className="text-blue-500" />
                                        <span className="text-gray-700">{r.recipientName}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => togglePaymentStatus(r.id)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                        r.paymentStatus === "paid"
                                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                                          : "bg-red-100 text-red-700 hover:bg-red-200"
                                      }`}
                                    >
                                      {r.paymentStatus === "paid" ? (
                                        <><CheckCircle2 size={12} />已付款</>
                                      ) : (
                                        <><XCircle size={12} />未付款</>
                                      )}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 text-gray-500">{r.remark || "-"}</td>
                                  <td className="px-4 py-3 text-gray-400">{r.time}</td>
                                </tr>
                              ))}
                            {outRecords.filter((r) => {
                              const matchRecipient = !recipientSearchText ||
                                (r.recipientName && r.recipientName.includes(recipientSearchText));
                              const matchPayment = outForm.paymentStatus === "all" ||
                                !outForm.paymentStatus ||
                                (r.paymentStatus || "unpaid") === outForm.paymentStatus;
                              return matchRecipient && matchPayment;
                            }).length === 0 && (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                  暂无出库记录
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 客户管理弹窗 */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCustomerModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h4 className="text-lg font-semibold text-gray-900">
              {customerModalMode === "add"
                ? "新增客户"
                : customerModalMode === "edit"
                  ? "编辑客户"
                  : "客户详情"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  客户名称 <span className="text-red-500">*</span>
                </label>
                <input
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="请输入客户名称"
                  disabled={customerModalMode === "view"}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setCustomerForm({ ...customerForm, phone: val });
                  }}
                  placeholder="请输入手机号"
                  disabled={customerModalMode === "view"}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                />
                {customerForm.phone && customerForm.phone.length !== 11 && customerModalMode !== "view" && (
                  <p className="text-xs text-red-500 mt-1">请输入11位手机号</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">欠款金额</label>
                <input
                  type="number"
                  step="0.01"
                  value={customerForm.debt}
                  onChange={(e) => setCustomerForm({ ...customerForm, debt: e.target.value })}
                  placeholder="0.00"
                  disabled={customerModalMode === "view"}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">客户分类</label>
                <select
                  value={customerForm.category}
                  onChange={(e) => setCustomerForm({ ...customerForm, category: e.target.value })}
                  disabled={customerModalMode === "view"}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                >
                  {customerCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">来源方式</label>
                <select
                  value={customerForm.source}
                  onChange={(e) => setCustomerForm({ ...customerForm, source: e.target.value })}
                  disabled={customerModalMode === "view"}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                >
                  {customerSources.map((src) => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">客户地址</label>
                <textarea
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="请输入客户地址"
                  rows={3}
                  disabled={customerModalMode === "view"}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                />
              </div>
            </div>

            {customerModalMode !== "view" && (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (!customerForm.name.trim()) {
                      alert("客户名称为必填项");
                      return;
                    }
                    if (customerForm.phone && customerForm.phone.length !== 11) {
                      alert("请输入正确的11位手机号");
                      return;
                    }
                    let updated;
                    if (customerModalMode === "add") {
                      const newCustomer = {
                        ...customerForm,
                        id: Date.now(),
                        debt: Number(customerForm.debt) || 0,
                      };
                      updated = [...customers, newCustomer];
                    } else {
                      updated = customers.map((c) =>
                        c.id === customerForm.id ? { ...customerForm, debt: Number(customerForm.debt) || 0 } : c,
                      );
                    }
                    setCustomers(updated);
                    localStorage.setItem("inventory_customers", JSON.stringify(updated));
                    setShowCustomerModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
                >
                  <PlusCircle size={16} />
                  {customerModalMode === "add" ? "确认添加" : "保存修改"}
                </button>
              </div>
            )}

            {customerModalMode === "view" && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 客户详情弹窗 */}
      {showCustomerDetailModal && selectedCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCustomerDetailModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              客户对账详情 - {selectedCustomerDetail.customerName}
            </h4>

            {/* 客户信息卡片 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">客户名称</p>
                  <p className="font-medium text-gray-800">{selectedCustomerDetail.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">联系电话</p>
                  <p className="font-medium text-gray-800">{selectedCustomerDetail.customerPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">客户分类</p>
                  <p className="font-medium text-gray-800">{selectedCustomerDetail.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">交易笔数</p>
                  <p className="font-medium text-gray-800">{selectedCustomerDetail.transactionCount} 笔</p>
                </div>
              </div>
            </div>

            {/* 金额统计 */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600">交易总额</p>
                <p className="text-lg font-bold text-gray-800">¥{selectedCustomerDetail.totalAmount.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600">已付金额</p>
                <p className="text-lg font-bold text-gray-800">¥{selectedCustomerDetail.paidAmount.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs text-red-600">未付金额</p>
                <p className="text-lg font-bold text-gray-800">¥{selectedCustomerDetail.unpaidAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* 交易记录 */}
            <h5 className="font-medium text-gray-800 mb-2">交易记录</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-3 py-2 text-left font-medium">商品</th>
                    <th className="px-3 py-2 text-right font-medium">数量</th>
                    <th className="px-3 py-2 text-right font-medium">单价</th>
                    <th className="px-3 py-2 text-right font-medium">金额</th>
                    <th className="px-3 py-2 text-left font-medium">付款状态</th>
                    <th className="px-3 py-2 text-left font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomerDetail.records?.map((record) => {
                    const product = products.find((p) => p.id === record.productId);
                    const amount = product ? product.price * Math.abs(record.quantity) : 0;
                    return (
                      <tr key={record.id} className="border-b border-gray-100">
                        <td className="px-3 py-2">{record.productName || product?.name || "未知商品"}</td>
                        <td className="px-3 py-2 text-right">{Math.abs(record.quantity)}</td>
                        <td className="px-3 py-2 text-right">¥{product?.price.toFixed(2) || "0.00"}</td>
                        <td className="px-3 py-2 text-right font-medium">¥{amount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            record.paymentStatus === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {record.paymentStatus === "paid" ? "已付款" : "未付款"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{record.time || record.createTime}</td>
                      </tr>
                    );
                  })}
                  {(!selectedCustomerDetail.records || selectedCustomerDetail.records.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                        暂无交易记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowCustomerDetailModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加商品弹窗 */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative space-y-4">
            <button
              onClick={() => setShowProductModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h4 className="text-lg font-semibold text-gray-900">添加新商品</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品名称</label>
              <input
                value={pname}
                onChange={(e) => setPname(e.target.value)}
                placeholder="请输入商品名称"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品单价</label>
              <input
                type="number"
                step="0.01"
                value={pprice}
                onChange={(e) => setPprice(e.target.value)}
                placeholder="请输入商品单价"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品分类</label>
              <select
                value={pcategory}
                onChange={(e) => setPcategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={addProduct}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
              >
                <PlusCircle size={16} />确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 入库弹窗 */}
      {showInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative space-y-4">
            <button
              onClick={() => setShowInModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h4 className="text-lg font-semibold text-gray-900">新增入库</h4>
            <div className="relative" ref={inDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择商品</label>
              <input
                type="text"
                value={inSearchText}
                onChange={(e) => {
                  setInSearchText(e.target.value);
                  setInForm({ ...inForm, productId: "" });
                  setInDropdownOpen(true);
                }}
                onFocus={() => setInDropdownOpen(true)}
                placeholder="搜索商品名称或ID"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {inDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredInProducts.length > 0 ? (
                    filteredInProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setInForm({ ...inForm, productId: p.id.toString() });
                          setInSearchText(`${p.name} (ID: ${p.id})`);
                          setInDropdownOpen(false);
                        }}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      >
                        {p.name} <span className="text-gray-400 ml-2">ID: {p.id}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">无匹配商品</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">入库数量</label>
              <input
                type="number"
                min="1"
                value={inForm.quantity}
                onChange={(e) => setInForm({ ...inForm, quantity: e.target.value })}
                placeholder="请输入入库数量"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={inForm.remark}
                onChange={(e) => setInForm({ ...inForm, remark: e.target.value })}
                placeholder="可选备注"
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowInModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={doIn}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
              >
                <ArrowUpRight size={16} />确认入库
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 出库弹窗 */}
      {showOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative space-y-4">
            <button
              type="button"
              onClick={() => setShowOutModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h4 className="text-lg font-semibold text-gray-900">新增出库</h4>
            <div className="relative" ref={outDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择商品</label>
              <input
                type="text"
                value={outSearchText}
                onChange={(e) => {
                  setOutSearchText(e.target.value);
                  setOutForm({ ...outForm, productId: "" });
                  setOutDropdownOpen(true);
                }}
                onFocus={() => setOutDropdownOpen(true)}
                placeholder="搜索商品名称或ID"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {outDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredOutProducts.length > 0 ? (
                    filteredOutProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setOutForm({ ...outForm, productId: p.id.toString() });
                          setOutSearchText(`${p.name} (库存: ${p.stock})`);
                          setOutDropdownOpen(false);
                        }}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      >
                        {p.name} <span className="text-gray-400 ml-2">库存: {p.stock}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">无匹配商品</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出库数量</label>
              <input
                type="number"
                min="1"
                value={outForm.quantity}
                onChange={(e) => setOutForm({ ...outForm, quantity: e.target.value })}
                placeholder="请输入出库数量"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* 接收方选择 */}
            <div className="relative" ref={recipientDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1">
                  <User size={14} /> 客户
                </span>
              </label>
              <input
                type="text"
                value={recipientSearchText}
                onChange={(e) => {
                  setRecipientSearchText(e.target.value);
                  setOutForm({ ...outForm, recipientId: "", recipientName: "" });
                  setRecipientDropdownOpen(true);
                }}
                onFocus={() => setRecipientDropdownOpen(true)}
                placeholder="搜索客户名称或手机号"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {recipientDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredRecipients.length > 0 ? (
                    filteredRecipients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setOutForm({ ...outForm, recipientId: c.id.toString(), recipientName: c.name });
                          setRecipientSearchText(c.name);
                          setRecipientDropdownOpen(false);
                        }}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span>{c.name}</span>
                          <span className="text-gray-400 text-xs">{c.phone}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      无匹配客户，请先前往"客户管理"添加
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 付款状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">付款状态</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOutForm({ ...outForm, paymentStatus: "unpaid" })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    outForm.paymentStatus === "unpaid"
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50/50"
                  }`}
                >
                  <XCircle size={16} /> 未付款
                </button>
                <button
                  type="button"
                  onClick={() => setOutForm({ ...outForm, paymentStatus: "paid" })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    outForm.paymentStatus === "paid"
                      ? "border-green-400 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-green-200 hover:bg-green-50/50"
                  }`}
                >
                  <CheckCircle2 size={16} /> 已付款
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={outForm.remark}
                onChange={(e) => setOutForm({ ...outForm, remark: e.target.value })}
                placeholder="可选备注"
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOutModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={doOut}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 flex items-center gap-2"
              >
                <ArrowDownRight size={16} />确认出库
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 财务管理模块组件
const FinanceModule = ({
  financeSubTab,
  reconciliationData,
  debtRecords,
  financeSearchKey,
  setFinanceSearchKey,
  financeFilterStatus,
  setFinanceFilterStatus,
  financeSortField,
  setFinanceSortField,
  financeSortOrder,
  setFinanceSortOrder,
  financeCurrentPage,
  setFinanceCurrentPage,
  financePageSize,
  setFinancePageSize,
  selectedCustomerDetail,
  setSelectedCustomerDetail,
  showCustomerDetailModal,
  setShowCustomerDetailModal,
  customers,
  outRecords,
  products,
}) => {
  // 对账汇总 - 计算关键指标
  const totalReceivable = reconciliationData.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalPaid = reconciliationData.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalUnpaid = reconciliationData.reduce((sum, r) => sum + r.unpaidAmount, 0);
  const overdueCount = debtRecords.filter((d) => d.status === "overdue").length;
  const overdueAmount = debtRecords
    .filter((d) => d.status === "overdue")
    .reduce((sum, d) => sum + d.debtAmount, 0);

  // 搜索和过滤
  const filterData = (data) => {
    return data.filter((item) => {
      const matchSearch =
        !financeSearchKey ||
        item.customerName?.includes(financeSearchKey) ||
        item.customerPhone?.includes(financeSearchKey);
      
      const matchStatus =
        financeFilterStatus === "all" ||
        (financeFilterStatus === "overdue" && item.status === "overdue") ||
        (financeFilterStatus === "paid" && item.status === "paid") ||
        (financeFilterStatus === "unpaid" && item.status === "unpaid");
      
      return matchSearch && matchStatus;
    });
  };

  // 排序
  const sortData = (data) => {
    return [...data].sort((a, b) => {
      let aVal = a[financeSortField];
      let bVal = b[financeSortField];
      
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (financeSortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  // 分页
  const paginateData = (data) => {
    const start = (financeCurrentPage - 1) * financePageSize;
    return data.slice(start, start + financePageSize);
  };

  const handleSort = (field) => {
    if (financeSortField === field) {
      setFinanceSortOrder(financeSortOrder === "asc" ? "desc" : "asc");
    } else {
      setFinanceSortField(field);
      setFinanceSortOrder("desc");
    }
  };

  const SortIcon = ({ field }) => {
    if (financeSortField !== field) return <SortAsc size={14} className="text-gray-300" />;
    return financeSortOrder === "asc" ? (
      <SortAsc size={14} className="text-blue-600" />
    ) : (
      <SortDesc size={14} className="text-blue-600" />
    );
  };

  // 查看客户详情
  const viewCustomerDetail = (customer) => {
    const customerOutRecords = outRecords.filter(
      (r) => r.recipientName === customer.customerName
    );
    const customerInfo = customers.find((c) => c.name === customer.customerName);
    
    setSelectedCustomerDetail({
      ...customer,
      records: customerOutRecords,
      customerInfo: customerInfo,
    });
    setShowCustomerDetailModal(true);
  };

  // 导出CSV
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => `"${val}"`)
        .join(",")
    );
    return [headers, ...rows].join("\n");
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // 对账汇总视图
  if (financeSubTab === "overview") {
    return (
      <div className="space-y-6">
        {/* 关键财务指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">应收总额</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{totalReceivable.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                <DollarSign size={24} />
              </div>
            </div>
            <p className="text-xs text-blue-500 mt-2">{reconciliationData.length} 位客户</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">已收金额</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{totalPaid.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <p className="text-xs text-green-500 mt-2">
              占比 {totalReceivable > 0 ? ((totalPaid / totalReceivable) * 100).toFixed(1) : 0}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">未收金额</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{totalUnpaid.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                <Clock size={24} />
              </div>
            </div>
            <p className="text-xs text-orange-500 mt-2">
              占比 {totalReceivable > 0 ? ((totalUnpaid / totalReceivable) * 100).toFixed(1) : 0}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">逾期欠款</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{overdueAmount.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white">
                <AlertTriangle size={24} />
              </div>
            </div>
            <p className="text-xs text-red-500 mt-2">{overdueCount} 笔逾期</p>
          </div>
        </div>

        {/* 客户对账汇总表 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <h3 className="font-semibold text-gray-800">客户对账汇总</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索客户"
                  value={financeSearchKey}
                  onChange={(e) => {
                    setFinanceSearchKey(e.target.value);
                    setFinanceCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <select
                value={financeFilterStatus}
                onChange={(e) => {
                  setFinanceFilterStatus(e.target.value);
                  setFinanceCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">全部状态</option>
                <option value="paid">已结清</option>
                <option value="unpaid">未结清</option>
                <option value="overdue">已逾期</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th 
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("customerName")}
                  >
                    <div className="flex items-center gap-1">
                      客户名称 <SortIcon field="customerName" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("totalAmount")}
                  >
                    <div className="flex items-center gap-1">
                      交易总额 <SortIcon field="totalAmount" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">已付金额</th>
                  <th 
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("unpaidAmount")}
                  >
                    <div className="flex items-center gap-1">
                      未付金额 <SortIcon field="unpaidAmount" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">交易笔数</th>
                  <th className="px-4 py-3 text-left font-medium">最后交易</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginateData(sortData(filterData(reconciliationData))).map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.customerName}</div>
                      <div className="text-xs text-gray-500">{item.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">¥{item.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-green-600">¥{item.paidAmount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={item.unpaidAmount > 0 ? "text-red-500 font-medium" : "text-gray-500"}>
                        ¥{item.unpaidAmount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.transactionCount} 笔</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.lastTransactionDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : item.status === "overdue"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                      }`}>
                        {item.status === "paid" ? (
                          <><CheckCircle2 size={12} />已结清</>
                        ) : item.status === "overdue" ? (
                          <><AlertTriangle size={12} />已逾期</>
                        ) : (
                          <><Clock size={12} />未结清</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => viewCustomerDetail(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                        title="查看详情"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filterData(reconciliationData).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      暂无对账数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {filterData(reconciliationData).length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                共 {filterData(reconciliationData).length} 条记录
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={financePageSize}
                  onChange={(e) => {
                    setFinancePageSize(Number(e.target.value));
                    setFinanceCurrentPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                >
                  <option value={10}>10条/页</option>
                  <option value={20}>20条/页</option>
                  <option value={50}>50条/页</option>
                </select>
                <button
                  onClick={() => setFinanceCurrentPage(Math.max(1, financeCurrentPage - 1))}
                  disabled={financeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600">
                  {financeCurrentPage} / {Math.max(1, Math.ceil(filterData(reconciliationData).length / financePageSize))}
                </span>
                <button
                  onClick={() => setFinanceCurrentPage(financeCurrentPage + 1)}
                  disabled={financeCurrentPage >= Math.ceil(filterData(reconciliationData).length / financePageSize)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 客户对账视图
  if (financeSubTab === "reconciliation") {
    const filteredReconciliation = filterData(reconciliationData);
    
    return (
      <div className="space-y-6">
        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户名称、手机号"
              value={financeSearchKey}
              onChange={(e) => {
                setFinanceSearchKey(e.target.value);
                setFinanceCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={financeFilterStatus}
              onChange={(e) => {
                setFinanceFilterStatus(e.target.value);
                setFinanceCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">全部状态</option>
              <option value="paid">已结清</option>
              <option value="unpaid">未结清</option>
              <option value="overdue">已逾期</option>
            </select>
          </div>
        </div>

        {/* 客户对账表格 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-4 py-3 text-left font-medium">客户信息</th>
                  <th className="px-4 py-3 text-left font-medium">客户分类</th>
                  <th className="px-4 py-3 text-right font-medium">交易总额</th>
                  <th className="px-4 py-3 text-right font-medium">已付金额</th>
                  <th className="px-4 py-3 text-right font-medium">未付金额</th>
                  <th className="px-4 py-3 text-center font-medium">交易笔数</th>
                  <th className="px-4 py-3 text-left font-medium">最后交易</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginateData(sortData(filteredReconciliation)).map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.customerName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={12} /> {item.customerPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.category === "VIP客户"
                          ? "bg-purple-100 text-purple-700"
                          : item.category === "批发客户"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">¥{item.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-green-600">¥{item.paidAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={item.unpaidAmount > 0 ? "text-red-500 font-medium" : "text-gray-500"}>
                        ¥{item.unpaidAmount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.transactionCount} 笔</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.lastTransactionDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : item.status === "overdue"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                      }`}>
                        {item.status === "paid" ? "已结清" : item.status === "overdue" ? "已逾期" : "未结清"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => viewCustomerDetail(item)}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReconciliation.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      暂无对账数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {filteredReconciliation.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                共 {filteredReconciliation.length} 条记录
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={financePageSize}
                  onChange={(e) => {
                    setFinancePageSize(Number(e.target.value));
                    setFinanceCurrentPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                >
                  <option value={10}>10条/页</option>
                  <option value={20}>20条/页</option>
                  <option value={50}>50条/页</option>
                </select>
                <button
                  onClick={() => setFinanceCurrentPage(Math.max(1, financeCurrentPage - 1))}
                  disabled={financeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600">
                  {financeCurrentPage} / {Math.ceil(filteredReconciliation.length / financePageSize)}
                </span>
                <button
                  onClick={() => setFinanceCurrentPage(financeCurrentPage + 1)}
                  disabled={financeCurrentPage >= Math.ceil(filteredReconciliation.length / financePageSize)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 欠款管理视图
  if (financeSubTab === "debt") {
    const filteredDebts = filterData(debtRecords);
    
    return (
      <div className="space-y-6">
        {/* 欠款统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">总欠款金额</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{debtRecords.reduce((sum, d) => sum + d.debtAmount, 0).toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white">
                <AlertTriangle size={24} />
              </div>
            </div>
            <p className="text-xs text-red-500 mt-2">{debtRecords.length} 笔欠款</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">逾期欠款</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{overdueAmount.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                <Clock size={24} />
              </div>
            </div>
            <p className="text-xs text-orange-500 mt-2">{overdueCount} 笔逾期</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">平均欠款</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{debtRecords.length > 0 ? (debtRecords.reduce((sum, d) => sum + d.debtAmount, 0) / debtRecords.length).toFixed(2) : "0.00"}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                <BarChart3 size={24} />
              </div>
            </div>
            <p className="text-xs text-blue-500 mt-2">基于当前欠款计算</p>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户名称、手机号"
              value={financeSearchKey}
              onChange={(e) => {
                setFinanceSearchKey(e.target.value);
                setFinanceCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={financeFilterStatus}
              onChange={(e) => {
                setFinanceFilterStatus(e.target.value);
                setFinanceCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">全部状态</option>
              <option value="unpaid">未付款</option>
              <option value="overdue">已逾期</option>
            </select>
          </div>
        </div>

        {/* 欠款表格 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-4 py-3 text-left font-medium">客户名称</th>
                  <th className="px-4 py-3 text-left font-medium">联系方式</th>
                  <th className="px-4 py-3 text-right font-medium cursor-pointer" onClick={() => handleSort("debtAmount")}>
                    <div className="flex items-center justify-end gap-1">
                      欠款金额 <SortIcon field="debtAmount" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">欠款日期</th>
                  <th className="px-4 py-3 text-left font-medium">到期日期</th>
                  <th className="px-4 py-3 text-center font-medium">逾期天数</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">备注</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginateData(sortData(filteredDebts)).map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.customerName}</td>
                    <td className="px-4 py-3 text-gray-500">{item.customerPhone}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-red-500 font-medium">¥{item.debtAmount.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.debtDate}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.dueDate}</td>
                    <td className="px-4 py-3 text-center">
                      {item.overdueDays > 0 ? (
                        <span className="text-red-500 font-medium">{item.overdueDays} 天</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.status === "overdue"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {item.status === "overdue" ? (
                          <><AlertTriangle size={12} />已逾期</>
                        ) : (
                          <><Clock size={12} />未付款</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.remark}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          const customer = reconciliationData.find((r) => r.customerName === item.customerName);
                          if (customer) viewCustomerDetail(customer);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                        title="查看详情"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDebts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      暂无欠款记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {filteredDebts.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                共 {filteredDebts.length} 条记录
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={financePageSize}
                  onChange={(e) => {
                    setFinancePageSize(Number(e.target.value));
                    setFinanceCurrentPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                >
                  <option value={10}>10条/页</option>
                  <option value={20}>20条/页</option>
                  <option value={50}>50条/页</option>
                </select>
                <button
                  onClick={() => setFinanceCurrentPage(Math.max(1, financeCurrentPage - 1))}
                  disabled={financeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600">
                  {financeCurrentPage} / {Math.ceil(filteredDebts.length / financePageSize)}
                </span>
                <button
                  onClick={() => setFinanceCurrentPage(financeCurrentPage + 1)}
                  disabled={financeCurrentPage >= Math.ceil(filteredDebts.length / financePageSize)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default App;