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
  Edit3,
  Eye,
  User,
  CheckCircle2,
  XCircle,
  Receipt,
  AlertTriangle,
  Download,
  SortAsc,
  SortDesc,
  Clock,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Filter,
  Calendar,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

// API 适配层 - 优先使用 Tauri invoke，降级到本地存储
const api = {
  // 商品管理
  getProducts: async () => {
    try {
      return await invoke("get_products");
    } catch (_e) {
      console.log("使用本地存储数据");
      return JSON.parse(localStorage.getItem("inventory_products") || "[]");
    }
  },
  addProduct: async (product) => {
    try {
      return await invoke("add_product", { product });
    } catch (_e) {
      const products = JSON.parse(localStorage.getItem("inventory_products") || "[]");
      product.id = Date.now();
      products.push(product);
      localStorage.setItem("inventory_products", JSON.stringify(products));
      return product;
    }
  },
  updateProduct: async (id, product) => {
    try {
      return await invoke("update_product", { id, product });
    } catch (_e) {
      const products = JSON.parse(localStorage.getItem("inventory_products") || "[]");
      const updated = products.map(p => p.id === id ? { ...product, id } : p);
      localStorage.setItem("inventory_products", JSON.stringify(updated));
      return { ...product, id };
    }
  },
  deleteProduct: async (id) => {
    try {
      return await invoke("delete_product", { id });
    } catch (_e) {
      const products = JSON.parse(localStorage.getItem("inventory_products") || "[]");
      const updated = products.filter(p => p.id !== id);
      localStorage.setItem("inventory_products", JSON.stringify(updated));
      return true;
    }
  },

  // 品牌管理
  getBrands: async () => {
    try {
      return await invoke("get_brands");
    } catch (_e) {
      return JSON.parse(localStorage.getItem("inventory_brands") || "[]");
    }
  },
  addBrand: async (name) => {
    try {
      return await invoke("add_brand", { brand: name });
    } catch (_e) {
      const brands = JSON.parse(localStorage.getItem("inventory_brands") || "[]");
      const newBrand = { id: Date.now(), name };
      brands.push(newBrand);
      localStorage.setItem("inventory_brands", JSON.stringify(brands));
      return true;
    }
  },
  deleteBrand: async (id) => {
    try {
      return await invoke("delete_brand", { id });
    } catch (_e) {
      const brands = JSON.parse(localStorage.getItem("inventory_brands") || "[]");
      const updated = brands.filter(b => b.id !== id);
      localStorage.setItem("inventory_brands", JSON.stringify(updated));
      return true;
    }
  },

  // 分类管理
  getCategories: async () => {
    try {
      return await invoke("get_categories");
    } catch (_e) {
      return JSON.parse(localStorage.getItem("inventory_categories") || "[]");
    }
  },
  addCategory: async (name) => {
    try {
      return await invoke("add_category", { category: name });
    } catch (_e) {
      const categories = JSON.parse(localStorage.getItem("inventory_categories") || "[]");
      const newCategory = { id: Date.now(), name };
      categories.push(newCategory);
      localStorage.setItem("inventory_categories", JSON.stringify(categories));
      return true;
    }
  },
  deleteCategory: async (id) => {
    try {
      return await invoke("delete_category", { id });
    } catch (_e) {
      const categories = JSON.parse(localStorage.getItem("inventory_categories") || "[]");
      const updated = categories.filter(c => c.id !== id);
      localStorage.setItem("inventory_categories", JSON.stringify(updated));
      return true;
    }
  },
  
  // 单位管理
  getUnits: async () => {
    try {
      return await invoke("get_units");
    } catch (_e) {
      return JSON.parse(localStorage.getItem("inventory_units") || "[]");
    }
  },
  addUnit: async (name) => {
    try {
      return await invoke("add_unit", { unit: name });
    } catch (_e) {
      const units = JSON.parse(localStorage.getItem("inventory_units") || "[]");
      const newUnit = { id: Date.now(), name };
      units.push(newUnit);
      localStorage.setItem("inventory_units", JSON.stringify(units));
      return true;
    }
  },
  deleteUnit: async (id) => {
    try {
      return await invoke("delete_unit", { id });
    } catch (_e) {
      const units = JSON.parse(localStorage.getItem("inventory_units") || "[]");
      const updated = units.filter(u => u.id !== id);
      localStorage.setItem("inventory_units", JSON.stringify(updated));
      return true;
    }
  },

  // 出入库记录
  getRecords: async (type) => {
    try {
      return await invoke("get_records", { type });
    } catch (_e) {
      return JSON.parse(localStorage.getItem(`inventory_records_${type}`) || "[]");
    }
  },
  addRecord: async (record) => {
    try {
      return await invoke("add_record", { record });
    } catch (_e) {
      const type = record.quantity > 0 ? "in" : "out";
      const records = JSON.parse(localStorage.getItem(`inventory_records_${type}`) || "[]");
      record.id = Date.now();
      record.createTime = new Date().toISOString();
      records.push(record);
      localStorage.setItem(`inventory_records_${type}`, JSON.stringify(records));
      return record;
    }
  },
};

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

  // 收款功能状态
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    customerId: null,
    customerName: "",
    amount: "",
    discount: "0",
    actualAmount: 0,
    businessTime: new Date().toISOString().slice(0, 16),
    remark: "",
    paymentMethod: "cash",
    transactionNo: "",
  });
  const [paymentRecords, setPaymentRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("inventory_payment_records") || "[]");
    } catch {
      return [];
    }
  });
  const [showPaymentRecordsModal, setShowPaymentRecordsModal] = useState(false);
  const [selectedCustomerPayments, setSelectedCustomerPayments] = useState([]);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState(null);

  // 商品管理相关状态（提前声明，避免在 useEffect 中访问未声明的变量）
  const [pname, setPname] = useState("");
  const [pprice, setPprice] = useState("");
  const [pcategory, setPcategory] = useState("办公用品");
  const [pbrand, setPbrand] = useState("");
  const [punit, setPunit] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalMode, setProductModalMode] = useState("add"); // add | edit
  const [editingProductId, setEditingProductId] = useState(null);

  // 加载财务数据
  const loadFinanceData = (customerList, outRecordsList) => {
    setFinanceLoading(true);

    // 生成财务对账数据 - 基于客户和出库记录
    const reconciliation = customerList.map((customer) => {
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

      const unpaidAmount = totalAmount - paidAmount + Number(customer.debt || 0);
      const lastTransactionDate = customerOutRecords.length > 0
        ? customerOutRecords[customerOutRecords.length - 1].createTime || customerOutRecords[customerOutRecords.length - 1].time
        : new Date().toISOString().split('T')[0];

      // 确定状态：如果有未付款且逾期超过7天，标记为逾期
      const hasOverdue = unpaidAmount > 0 && Number(customer.debt || 0) > 0;

      return {
        id: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        unpaidAmount: unpaidAmount,
        lastTransactionDate: lastTransactionDate,
        transactionCount: customerOutRecords.length,
        status: unpaidAmount > 0 ? (hasOverdue ? "overdue" : "unpaid") : "paid",
        overdueDays: hasOverdue ? Math.floor(Math.random() * 30) + 1 : 0,
        category: customer.category,
      };
    }).filter(r => r.transactionCount > 0 || r.unpaidAmount > 0);

    // 生成欠款记录 - 基于客户欠款数据
    const debtRecs = customerList
      .filter((c) => Number(c.debt || 0) > 0)
      .map((customer) => ({
        id: customer.id + '_debt',
        customerName: customer.name,
        customerPhone: customer.phone,
        debtAmount: Number(customer.debt),
        debtDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: Number(customer.debt) > 1000 ? "overdue" : "unpaid",
        overdueDays: Number(customer.debt) > 1000 ? Math.floor(Math.random() * 15) + 1 : 0,
        category: customer.category,
        remark: "客户欠款",
      }));

    setReconciliationData(reconciliation);
    setDebtRecords(debtRecs);

    setTimeout(() => setFinanceLoading(false), 300);
  };

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
          api.getProducts(),
          api.getBrands(),
          api.getCategories(),
          api.getUnits(),
          api.getRecords("in"),
          api.getRecords("out"),
        ]);

        setProducts(productsRes);
        const brandList = brandsRes.map((b) => b.name);
        const categoryList = categoriesRes.map((c) => c.name);
        const unitList = unitsRes.map((u) => u.name);
        setBrands(brandList);
        setCategories(categoryList);
        setUnits(unitList);

        // 确保表单默认值与加载的数据同步
        if (brandList.length > 0 && !pbrand) setPbrand(brandList[0]);
        if (categoryList.length > 0 && !pcategory) setPcategory(categoryList[0]);
        if (unitList.length > 0 && !punit) setPunit(unitList[0]);
        // 修正时间字段映射
        setInRecords(inRecordsRes.map((r) => ({ ...r, time: r.createTime })));
        // 合并出库记录的本地扩展字段
        const savedOutExtras = localStorage.getItem("inventory_out_extras");
        const extrasMap = savedOutExtras ? JSON.parse(savedOutExtras) : {};
        const processedOutRecords = outRecordsRes.map((r) => ({
          ...r,
          time: r.createTime,
          recipientName: extrasMap[r.id]?.recipientName || r.recipientName || "",
          paymentStatus: extrasMap[r.id]?.paymentStatus || r.paymentStatus || "unpaid",
        }));
        setOutRecords(processedOutRecords);

        // 加载客户数据（使用本地存储模拟）
        const savedCustomers = localStorage.getItem("inventory_customers");
        let loadedCustomers = [];
        if (savedCustomers) {
          loadedCustomers = JSON.parse(savedCustomers);
          setCustomers(loadedCustomers);
        }

        // 加载财务数据 - 使用处理后的出库记录
        loadFinanceData(loadedCustomers, processedOutRecords);
      } catch (error) {
        console.error("加载数据失败:", error);
        alert('请求异常: ' + error.message);
      } 
    };
    fetchInitialData();
  }, []);

  // 加载财务数据 - 已在前面声明，这里不再重复

  // 刷新财务数据
  const refreshFinanceData = () => {
    loadFinanceData(customers, outRecords);
  };

  // 当客户数据变化时，自动刷新财务数据
  useEffect(() => {
    if (customers.length > 0) {
      // 使用 setTimeout 避免在 effect 中直接调用 setState
      const timer = setTimeout(() => {
        loadFinanceData(customers, outRecords);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [customers]);

  // 数字转中文大写金额
  const numberToChinese = (num) => {
    const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
    const units = ["", "拾", "佰", "仟", "万", "拾", "佰", "仟", "亿"];
    
    if (num === 0) return "零元整";
    if (num < 0) return "负数" + numberToChinese(-num);
    
    let result = "";
    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);
    
    // 处理整数部分
    if (integerPart > 0) {
      let str = integerPart.toString();
      let zeroFlag = false;
      
      for (let i = 0; i < str.length; i++) {
        const digit = parseInt(str[i]);
        const unit = units[str.length - 1 - i];
        
        if (digit === 0) {
          if (!zeroFlag && result.length > 0) {
            zeroFlag = true;
          }
        } else {
          if (zeroFlag) {
            result += "零";
            zeroFlag = false;
          }
          result += digits[digit] + unit;
        }
      }
      
      result += "元";
    } else {
      result = "零元";
    }
    
    // 处理小数部分
    if (decimalPart > 0) {
      const jiao = Math.floor(decimalPart / 10);
      const fen = decimalPart % 10;
      
      if (jiao > 0) {
        result += digits[jiao] + "角";
      }
      if (fen > 0) {
        result += digits[fen] + "分";
      }
    } else {
      result += "整";
    }
    
    return result;
  };

  // 打开收款弹窗
  const openPaymentModal = (customer) => {
    setPaymentForm({
      customerId: customer.id,
      customerName: customer.customerName,
      amount: "",
      discount: "0",
      actualAmount: 0,
      businessTime: new Date().toISOString().slice(0, 16),
      remark: "",
      paymentMethod: "cash",
      transactionNo: "",
    });
    setShowPaymentModal(true);
  };

  // 打开客户收款记录弹窗
  const openPaymentRecordsModal = (customer) => {
    const customerPayments = paymentRecords.filter(
      (p) => p.customerId === customer.id
    );
    setSelectedCustomerPayments(customerPayments);
    setShowPaymentRecordsModal(true);
  };

  // 删除收款记录
  const deletePaymentRecord = (paymentId) => {
    if (!window.confirm("确认删除该收款记录？删除后将恢复对应的客户欠款。")) return;
    
    const payment = paymentRecords.find((p) => p.id === paymentId);
    if (!payment) return;
    
    // 恢复客户欠款
    const updatedCustomers = customers.map((c) => {
      if (c.id === payment.customerId) {
        const newDebt = parseFloat(c.debt || 0) + payment.actualAmount;
        return { ...c, debt: newDebt.toString() };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    localStorage.setItem("inventory_customers", JSON.stringify(updatedCustomers));
    
    // 删除收款记录
    const updatedRecords = paymentRecords.filter((p) => p.id !== paymentId);
    setPaymentRecords(updatedRecords);
    localStorage.setItem("inventory_payment_records", JSON.stringify(updatedRecords));
    
    // 更新当前显示的收款记录
    setSelectedCustomerPayments(updatedRecords.filter((p) => p.customerId === payment.customerId));
    
    // 刷新财务数据
    loadFinanceData(updatedCustomers, outRecords);
    
    alert("收款记录已删除，客户欠款已恢复");
  };

  // 打开编辑收款记录弹窗
  const openEditPaymentModal = (payment) => {
    setEditingPaymentId(payment.id);
    setEditPaymentForm({ ...payment });
  };

  // 保存编辑的收款记录
  const saveEditPayment = () => {
    if (!editPaymentForm) return;
    
    const newAmount = parseFloat(editPaymentForm.amount);
    const newDiscount = parseFloat(editPaymentForm.discount) || 0;
    const newActualAmount = Math.max(0, newAmount - newDiscount);
    
    if (isNaN(newAmount) || newAmount <= 0) {
      alert("收款金额必须大于0");
      return;
    }
    
    if (newDiscount < 0) {
      alert("优惠金额不能为负数");
      return;
    }
    
    if (newDiscount > newAmount) {
      alert("优惠金额不能大于收款金额");
      return;
    }
    
    const oldPayment = paymentRecords.find((p) => p.id === editingPaymentId);
    if (!oldPayment) return;
    
    // 计算差额
    const amountDiff = newActualAmount - oldPayment.actualAmount;
    
    // 更新客户欠款
    const updatedCustomers = customers.map((c) => {
      if (c.id === oldPayment.customerId) {
        const newDebt = Math.max(0, parseFloat(c.debt || 0) - amountDiff);
        return { ...c, debt: newDebt.toString() };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    localStorage.setItem("inventory_customers", JSON.stringify(updatedCustomers));
    
    // 更新收款记录
    const updatedRecords = paymentRecords.map((p) => {
      if (p.id === editingPaymentId) {
        return {
          ...p,
          amount: newAmount,
          discount: newDiscount,
          actualAmount: newActualAmount,
          businessTime: editPaymentForm.businessTime,
          remark: editPaymentForm.remark,
          paymentMethod: editPaymentForm.paymentMethod,
          transactionNo: editPaymentForm.transactionNo,
          updateTime: new Date().toISOString(),
        };
      }
      return p;
    });
    setPaymentRecords(updatedRecords);
    localStorage.setItem("inventory_payment_records", JSON.stringify(updatedRecords));
    
    // 更新当前显示的收款记录
    setSelectedCustomerPayments(updatedRecords.filter((p) => p.customerId === oldPayment.customerId));
    
    // 关闭编辑弹窗
    setEditingPaymentId(null);
    setEditPaymentForm(null);
    
    // 刷新财务数据
    loadFinanceData(updatedCustomers, outRecords);
    
    alert("收款记录已更新");
  };

  // 提交收款
  const submitPayment = () => {
    const amount = parseFloat(paymentForm.amount);
    const discount = parseFloat(paymentForm.discount) || 0;
    
    // 数据验证
    if (isNaN(amount) || amount <= 0) {
      alert("收款金额必须大于0");
      return;
    }
    
    if (discount < 0) {
      alert("优惠金额不能为负数");
      return;
    }
    
    if (discount > amount) {
      alert("优惠金额不能大于收款金额");
      return;
    }
    
    const actualAmount = amount - discount;
    
    // 查找客户
    const customer = customers.find((c) => c.id === paymentForm.customerId);
    if (!customer) {
      alert("客户不存在");
      return;
    }
    
    // 检查欠款余额
    const customerDebt = debtRecords.find((d) => d.customerName === customer.name);
    const currentDebt = customerDebt ? customerDebt.debtAmount : 0;
    
    if (actualAmount > currentDebt) {
      alert(`收款金额超过客户欠款余额！\n当前欠款：¥${currentDebt.toFixed(2)}\n实际应收：¥${actualAmount.toFixed(2)}`);
      return;
    }
    
    // 生成收款记录
    const newPaymentRecord = {
      id: Date.now(),
      customerId: paymentForm.customerId,
      customerName: paymentForm.customerName,
      amount: amount,
      discount: discount,
      actualAmount: actualAmount,
      businessTime: paymentForm.businessTime,
      remark: paymentForm.remark,
      paymentMethod: paymentForm.paymentMethod || "cash",
      transactionNo: paymentForm.transactionNo || "",
      createTime: new Date().toISOString(),
    };
    
    // 更新收款记录
    const updatedRecords = [newPaymentRecord, ...paymentRecords];
    setPaymentRecords(updatedRecords);
    localStorage.setItem("inventory_payment_records", JSON.stringify(updatedRecords));
    
    // 更新客户欠款
    const updatedCustomers = customers.map((c) => {
      if (c.id === paymentForm.customerId) {
        const newDebt = Math.max(0, parseFloat(c.debt || 0) - actualAmount);
        return { ...c, debt: newDebt.toString() };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    localStorage.setItem("inventory_customers", JSON.stringify(updatedCustomers));
    
    // 刷新财务数据
    loadFinanceData(updatedCustomers, outRecords);
    
    // 关闭弹窗
    setShowPaymentModal(false);
    
    // 显示成功提示
    alert(`收款成功！\n客户：${paymentForm.customerName}\n收款金额：¥${amount.toFixed(2)}\n优惠金额：¥${discount.toFixed(2)}\n实际应收：¥${actualAmount.toFixed(2)}`);
  };

  // 库存日志状态
  const [showStockLogModal, setShowStockLogModal] = useState(false);
  const [stockLogs, setStockLogs] = useState([]);
  const [logFilterType, setLogFilterType] = useState("all"); // all | in | out
  const [_logFilterProduct, _setLogFilterProduct] = useState("");
  const [logFilterDateStart, setLogFilterDateStart] = useState("");
  const [logFilterDateEnd, setLogFilterDateEnd] = useState("");

  // 商品管理相关状态已在前面声明，这里不再重复

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
  const [_chartTooltip, _setChartTooltip] = useState({ show: false, x: 0, y: 0, text: "" });
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
      (item.brand && item.brand.includes(searchKey)) ||
      (item.unit && item.unit.includes(searchKey)) ||
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
    setPbrand(brands[0] || "");
    setPunit(units[0] || "");
    setProductModalMode("add");
    setEditingProductId(null);
    setShowProductModal(true);
  };

  const openEditProductModal = (product) => {
    setPname(product.name);
    setPprice(product.price.toString());
    setPcategory(product.category || categories[0] || "办公用品");
    setPbrand(product.brand || brands[0] || "");
    setPunit(product.unit || units[0] || "");
    setProductModalMode("edit");
    setEditingProductId(product.id);
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!pname || !pprice) return;
    setLoading(true);
    try {
      const productData = {
        name: pname,
        price: Number(pprice),
        stock: 0,
        category: pcategory,
        brand: pbrand,
        unit: punit,
        update_time: new Date().toISOString().split('T')[0],
      };
      
      if (productModalMode === "add") {
        await api.addProduct(productData);
      } else {
        await api.updateProduct(editingProductId, productData);
      }
      
      const newProducts = await api.getProducts();
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
    await api.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setLoading(false);
  };

  // ---------- 品牌/分类/单位管理 ----------
  const addBrand = async () => {
    if (!newBrand.trim()) return;
    try {
      await api.addBrand(newBrand.trim());
      const data = await api.getBrands();
      setBrands(data.map((b) => b.name));
      setNewBrand("");
    } catch (e) {
      console.error("添加品牌失败", e);
    }
  };

  const deleteBrand = async (index) => {
    if (!window.confirm("确认删除该品牌？")) return;
    const brandsData = await api.getBrands();
    const brandToDelete = brandsData[index];
    if (!brandToDelete) return;
    await api.deleteBrand(brandToDelete.id);
    const updated = await api.getBrands();
    setBrands(updated.map((b) => b.name));
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await api.addCategory(newCategory.trim());
      const data = await api.getCategories();
      setCategories(data.map((c) => c.name));
      setNewCategory("");
    } catch (e) {
      console.error("添加分类失败", e);
    }
  };

  const deleteCategory = async (index) => {
    if (!window.confirm("确认删除该分类？")) return;
    const catData = await api.getCategories();
    const catToDelete = catData[index];
    if (!catToDelete) return;
    await api.deleteCategory(catToDelete.id);
    const updated = await api.getCategories();
    setCategories(updated.map((c) => c.name));
  };

  const addUnit = async () => {
    if (!newUnit.trim()) return;
    try {
      await api.addUnit(newUnit.trim());
      const data = await api.getUnits();
      setUnits(data.map((u) => u.name));
      setNewUnit("");
    } catch (e) {
      console.error("添加单位失败", e);
    }
  };

  const deleteUnit = async (index) => {
    if (!window.confirm("确认删除该单位？")) return;
    const unitData = await api.getUnits();
    const unitToDelete = unitData[index];
    if (!unitToDelete) return;
    await api.deleteUnit(unitToDelete.id);
    const updated = await api.getUnits();
    setUnits(updated.map((u) => u.name));
  };

  // ---------- 入库 ----------
  const openInModal = () => {
    setInForm({ productId: "", quantity: "", remark: "" });
    setInSearchText("");
    setInDropdownOpen(false);
    setShowInModal(true);
  };

  // 库存操作日志
  const addStockLog = (type, productId, productName, quantity, beforeStock, afterStock, remark) => {
    const logs = JSON.parse(localStorage.getItem("inventory_stock_logs") || "[]");
    const newLog = {
      id: Date.now(),
      type, // 'in' | 'out'
      productId,
      productName,
      quantity,
      beforeStock,
      afterStock,
      remark,
      operator: "系统用户", // 可扩展为实际登录用户
      createTime: new Date().toISOString(),
    };
    logs.unshift(newLog); // 新日志在前面
    // 只保留最近 1000 条日志
    if (logs.length > 1000) logs.pop();
    localStorage.setItem("inventory_stock_logs", JSON.stringify(logs));
    return newLog;
  };

  const getStockLogs = (filters = {}) => {
    const logs = JSON.parse(localStorage.getItem("inventory_stock_logs") || "[]");
    return logs.filter((log) => {
      if (filters.type && log.type !== filters.type) return false;
      if (filters.productId && log.productId !== filters.productId) return false;
      if (filters.startDate && log.createTime < filters.startDate) return false;
      if (filters.endDate && log.createTime > filters.endDate) return false;
      return true;
    });
  };

  const doIn = async () => {
    const id = parseInt(inForm.productId);
    const num = parseInt(inForm.quantity);
    if (isNaN(id) || isNaN(num) || num <= 0) {
      alert("请输入有效的商品和数量");
      return;
    }
    
    // 获取当前商品信息
    const product = products.find((p) => p.id === id);
    if (!product) {
      alert("未找到该商品");
      return;
    }
    
    const beforeStock = product.stock || 0;
    const afterStock = beforeStock + num;
    
    setLoading(true);
    try {
      // 1. 添加入库记录
      await api.addRecord({
        productId: id,
        quantity: num,
        remark: inForm.remark,
      });
      
      // 2. 更新商品库存（原子操作）
      const updatedProducts = products.map((p) => {
        if (p.id === id) {
          return { ...p, stock: afterStock, update_time: new Date().toISOString().split('T')[0] };
        }
        return p;
      });
      setProducts(updatedProducts);
      
      // 3. 同步更新本地存储
      localStorage.setItem("inventory_products", JSON.stringify(updatedProducts));
      
      // 4. 记录库存变动日志
      addStockLog("in", id, product.name, num, beforeStock, afterStock, inForm.remark);
      
      // 5. 刷新入库记录列表
      const inRecsRes = await api.getRecords("in");
      setInRecords(inRecsRes.map((r) => ({ ...r, time: r.createTime })));
      
      // 6. 显示操作结果
      alert(`入库成功！\n商品：${product.name}\n入库数量：${num}\n入库前库存：${beforeStock}\n入库后库存：${afterStock}`);
      
      // 7. 关闭弹窗并清空表单
      setShowInModal(false);
      setInForm({ productId: "", quantity: "", remark: "" });
      setInSearchText("");
    } catch (e) {
      console.error("入库操作失败:", e);
      alert("入库操作失败：" + e.message);
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
    // 触发财务数据刷新
    loadFinanceData(customers, updated);
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
    if (isNaN(id) || isNaN(num) || num <= 0) {
      alert("请输入有效的商品和数量");
      return;
    }
    
    // 获取当前商品信息
    const product = products.find((p) => p.id === id);
    if (!product) {
      alert("未找到该商品");
      return;
    }
    
    const beforeStock = product.stock || 0;
    if (beforeStock < num) {
      alert(`库存不足！当前库存：${beforeStock}，出库数量：${num}`);
      return;
    }
    const afterStock = beforeStock - num;
    
    setLoading(true);
    try {
      // 1. 添加出库记录
      await api.addRecord({
        productId: id,
        quantity: -num,
        remark: outForm.remark,
      });
      
      // 2. 更新商品库存（原子操作）
      const updatedProducts = products.map((p) => {
        if (p.id === id) {
          return { ...p, stock: afterStock, update_time: new Date().toISOString().split('T')[0] };
        }
        return p;
      });
      setProducts(updatedProducts);
      
      // 3. 同步更新本地存储
      localStorage.setItem("inventory_products", JSON.stringify(updatedProducts));
      
      // 4. 记录库存变动日志
      addStockLog("out", id, product.name, num, beforeStock, afterStock, outForm.remark);
      
      // 5. 刷新出库记录列表
      const outRecsRes = await api.getRecords("out");
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
      
      // 6. 显示操作结果
      alert(`出库成功！\n商品：${product.name}\n出库数量：${num}\n出库前库存：${beforeStock}\n出库后库存：${afterStock}`);
      
      // 7. 关闭弹窗并清空表单
      setShowOutModal(false);
      setOutForm({ productId: "", quantity: "", remark: "", recipientId: "", recipientName: "", paymentStatus: "unpaid" });
      setOutSearchText("");
      setRecipientSearchText("");
      
      // 8. 触发财务数据刷新
      loadFinanceData(customers, outRecsRes.map((r) => ({
        ...r,
        time: r.createTime,
        recipientName: extrasMap[r.id]?.recipientName || r.recipientName || "",
        paymentStatus: extrasMap[r.id]?.paymentStatus || r.paymentStatus || "unpaid",
      })));
    } catch (e) {
      console.error("出库操作失败:", e);
      alert("出库操作失败：" + e.message);
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openInModal}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <ArrowUpRight size={16} /> 新入库
                    </button>
                    <button
                      onClick={() => {
                        setStockLogs(getStockLogs({ type: "in" }));
                        setShowStockLogModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Clock size={14} /> 入库日志
                    </button>
                  </div>
                )}
                {tab === "out" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openOutModal}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors flex items-center gap-2"
                    >
                      <ArrowDownRight size={16} /> 新出库
                    </button>
                    <button
                      onClick={() => {
                        setStockLogs(getStockLogs({ type: "out" }));
                        setShowStockLogModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Clock size={14} /> 出库日志
                    </button>
                  </div>
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
                        if (!data || data.length === 0) return;
                        const headers = Object.keys(data[0]).join(",");
                        const rows = data.map((row) =>
                          Object.values(row)
                            .map((val) => `"${val}"`)
                            .join(",")
                        );
                        const csv = [headers, ...rows].join("\n");
                        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = `财务数据_${financeSubTab}_${new Date().toISOString().split('T')[0]}.csv`;
                        link.click();
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
                      openPaymentModal={openPaymentModal}
                      openPaymentRecordsModal={openPaymentRecordsModal}
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
                                            // 触发财务数据刷新
                                            loadFinanceData(updated, outRecords);
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
                            <th className="px-4 py-3 text-left font-medium">品牌</th>
                            <th className="px-4 py-3 text-left font-medium">分类</th>
                            <th className="px-4 py-3 text-left font-medium">单价</th>
                            <th className="px-4 py-3 text-left font-medium">库存</th>
                            <th className="px-4 py-3 text-left font-medium">单位</th>
                            <th className="px-4 py-3 text-left font-medium rounded-tr-lg">更新时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((p) => (
                              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-500">{p.id}</td>
                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                <td className="px-4 py-3 text-gray-500">{p.brand || "-"}</td>
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
                                <td className="px-4 py-3 text-gray-500">{p.unit || "-"}</td>
                                <td className="px-4 py-3 text-gray-400">{p.updateTime}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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
                                <th className="px-4 py-3 text-left font-medium">品牌</th>
                                <th className="px-4 py-3 text-left font-medium">分类</th>
                                <th className="px-4 py-3 text-left font-medium">单价</th>
                                <th className="px-4 py-3 text-left font-medium">库存</th>
                                <th className="px-4 py-3 text-left font-medium">单位</th>
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
                                    <td className="px-4 py-3 text-gray-500">{p.brand || "-"}</td>
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
                                    <td className="px-4 py-3 text-gray-500">{p.unit || "-"}</td>
                                    <td className="px-4 py-3 text-gray-400">{p.updateTime}</td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => openEditProductModal(p)}
                                          className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                          title="编辑"
                                        >
                                          <Edit3 size={16} />
                                        </button>
                                        <button
                                          onClick={() => deleteProduct(p.id)}
                                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                          title="删除"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
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
                            inRecords.map((r) => {
                              // 从 products 数组中查找商品名称
                              const product = products.find((p) => p.id === r.productId);
                              const productName = product?.name || r.productName || "未知商品";
                              return (
                                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-4 py-3 text-gray-500">{r.productId}</td>
                                  <td className="px-4 py-3 font-medium">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Package size={12} className="text-blue-600" />
                                      </div>
                                      {productName}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-green-600 font-medium">+{r.quantity}</td>
                                  <td className="px-4 py-3 text-gray-500">{r.remark || "-"}</td>
                                  <td className="px-4 py-3 text-gray-400">{r.time}</td>
                                </tr>
                              );
                            })
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
                              .map((r) => {
                                // 从 products 数组中查找商品名称
                                const product = products.find((p) => p.id === r.productId);
                                const productName = product?.name || r.productName || "未知商品";
                                return (
                                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-500">{r.productId}</td>
                                    <td className="px-4 py-3 font-medium">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <Package size={12} className="text-blue-600" />
                                        </div>
                                        {productName}
                                      </div>
                                    </td>
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
                              )})}
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
                    // 触发财务数据刷新
                    loadFinanceData(updated, outRecords);
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

            {/* 收款记录 */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-800">收款记录</h5>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    共 {paymentRecords.filter((p) => p.customerId === selectedCustomerDetail.id).length} 笔
                  </span>
                  {selectedCustomerDetail.unpaidAmount > 0 && (
                    <button
                      onClick={() => {
                        openPaymentModal({
                          id: selectedCustomerDetail.id,
                          customerName: selectedCustomerDetail.customerName,
                        });
                      }}
                      className="px-3 py-1 text-xs text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <DollarSign size={12} /> 新增收款
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="px-3 py-2 text-left font-medium">收款日期</th>
                      <th className="px-3 py-2 text-right font-medium">收款金额</th>
                      <th className="px-3 py-2 text-right font-medium">优惠</th>
                      <th className="px-3 py-2 text-right font-medium">实际应收</th>
                      <th className="px-3 py-2 text-left font-medium">支付方式</th>
                      <th className="px-3 py-2 text-left font-medium">流水号</th>
                      <th className="px-3 py-2 text-left font-medium">备注</th>
                      <th className="px-3 py-2 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRecords
                      .filter((p) => p.customerId === selectedCustomerDetail.id)
                      .sort((a, b) => new Date(b.businessTime) - new Date(a.businessTime))
                      .map((payment) => (
                        <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600 text-xs">
                            {new Date(payment.businessTime).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">¥{payment.amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-orange-600">
                            ¥{payment.discount?.toFixed(2) || "0.00"}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-600">
                            ¥{payment.actualAmount.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                              payment.paymentMethod === "cash"
                                ? "bg-green-100 text-green-700"
                                : payment.paymentMethod === "bank"
                                ? "bg-blue-100 text-blue-700"
                                : payment.paymentMethod === "wechat"
                                ? "bg-emerald-100 text-emerald-700"
                                : payment.paymentMethod === "alipay"
                                ? "bg-cyan-100 text-cyan-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {payment.paymentMethod === "cash" && "现金"}
                              {payment.paymentMethod === "bank" && "银行"}
                              {payment.paymentMethod === "wechat" && "微信"}
                              {payment.paymentMethod === "alipay" && "支付宝"}
                              {payment.paymentMethod === "other" && "其他"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-500 text-xs font-mono">
                            {payment.transactionNo || "-"}
                          </td>
                          <td className="px-3 py-2 text-gray-500 text-xs max-w-[100px] truncate">
                            {payment.remark || "-"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditPaymentModal(payment)}
                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                title="编辑"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => deletePaymentRecord(payment.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="删除"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {paymentRecords.filter((p) => p.customerId === selectedCustomerDetail.id).length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                          暂无收款记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 交易记录 */}
            <div className="mt-6">
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

      {/* 收款弹窗 */}
      <PaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        onSubmit={submitPayment}
        numberToChinese={numberToChinese}
      />

      {/* 收款记录列表弹窗 */}
      {showPaymentRecordsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative max-h-[90vh] overflow-hidden flex flex-col">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Receipt size={20} className="text-purple-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">收款记录</h4>
                  <p className="text-xs text-gray-500">
                    {selectedCustomerPayments.length > 0 
                      ? `${selectedCustomerPayments[0]?.customerName} - 共 ${selectedCustomerPayments.length} 笔收款`
                      : "暂无收款记录"
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPaymentRecordsModal(false);
                  setSelectedCustomerPayments([]);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* 收款记录列表 */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {selectedCustomerPayments.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="px-4 py-3 text-left font-medium">收款日期</th>
                        <th className="px-4 py-3 text-right font-medium">收款金额</th>
                        <th className="px-4 py-3 text-right font-medium">优惠金额</th>
                        <th className="px-4 py-3 text-right font-medium">实际应收</th>
                        <th className="px-4 py-3 text-left font-medium">支付方式</th>
                        <th className="px-4 py-3 text-left font-medium">交易流水号</th>
                        <th className="px-4 py-3 text-left font-medium">备注</th>
                        <th className="px-4 py-3 text-right font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedCustomerPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(payment.businessTime).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-800">
                            ¥{payment.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600">
                            ¥{payment.discount?.toFixed(2) || "0.00"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">
                            ¥{payment.actualAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                              payment.paymentMethod === "cash"
                                ? "bg-green-100 text-green-700"
                                : payment.paymentMethod === "bank"
                                ? "bg-blue-100 text-blue-700"
                                : payment.paymentMethod === "wechat"
                                ? "bg-emerald-100 text-emerald-700"
                                : payment.paymentMethod === "alipay"
                                ? "bg-cyan-100 text-cyan-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {payment.paymentMethod === "cash" && "💵 现金"}
                              {payment.paymentMethod === "bank" && "🏦 银行转账"}
                              {payment.paymentMethod === "wechat" && "💚 微信支付"}
                              {payment.paymentMethod === "alipay" && "🔵 支付宝"}
                              {payment.paymentMethod === "other" && "📝 其他"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                            {payment.transactionNo || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">
                            {payment.remark || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditPaymentModal(payment)}
                                className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                                title="编辑"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => deletePaymentRecord(payment.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                title="删除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <Receipt size={32} className="text-gray-300" />
                  </div>
                  <p className="text-sm">暂无收款记录</p>
                  <p className="text-xs mt-1">该客户暂未有收款记录</p>
                </div>
              )}
            </div>

            {/* 底部统计 */}
            {selectedCustomerPayments.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-gray-500">收款笔数</p>
                      <p className="text-lg font-bold text-gray-800">{selectedCustomerPayments.length} 笔</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">收款总额</p>
                      <p className="text-lg font-bold text-green-600">
                        ¥{selectedCustomerPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">优惠总额</p>
                      <p className="text-lg font-bold text-orange-600">
                        ¥{selectedCustomerPayments.reduce((sum, p) => sum + (p.discount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">实际应收总额</p>
                      <p className="text-lg font-bold text-blue-600">
                        ¥{selectedCustomerPayments.reduce((sum, p) => sum + p.actualAmount, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPaymentRecordsModal(false);
                      setSelectedCustomerPayments([]);
                    }}
                    className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 编辑收款记录弹窗 */}
      {editingPaymentId && editPaymentForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Edit3 size={20} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">编辑收款记录</h4>
                  <p className="text-xs text-gray-500">{editPaymentForm.customerName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingPaymentId(null);
                  setEditPaymentForm(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* 表单内容 */}
            <div className="px-6 py-6 space-y-5">
              {/* 收款金额 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  收款金额 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editPaymentForm.amount}
                    onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* 优惠金额 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优惠金额 <span className="text-gray-400 font-normal">(选填)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPaymentForm.discount || "0"}
                    onChange={(e) => setEditPaymentForm({ ...editPaymentForm, discount: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* 支付方式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  支付方式 <span className="text-red-500">*</span>
                </label>
                <select
                  value={editPaymentForm.paymentMethod || "cash"}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                >
                  <option value="cash">💵 现金</option>
                  <option value="bank">🏦 银行转账</option>
                  <option value="wechat">💚 微信支付</option>
                  <option value="alipay">🔵 支付宝</option>
                  <option value="other">📝 其他</option>
                </select>
              </div>

              {/* 交易流水号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  交易流水号 <span className="text-gray-400 font-normal">(选填)</span>
                </label>
                <input
                  type="text"
                  value={editPaymentForm.transactionNo || ""}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, transactionNo: e.target.value })}
                  placeholder="请输入交易流水号"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>

              {/* 业务时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  业务时间 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={editPaymentForm.businessTime}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, businessTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注 <span className="text-gray-400 font-normal">(选填)</span>
                </label>
                <textarea
                  value={editPaymentForm.remark || ""}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, remark: e.target.value })}
                  placeholder="请输入备注信息"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setEditingPaymentId(null);
                  setEditPaymentForm(null);
                }}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                取消
              </button>
              <button
                onClick={saveEditPayment}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 size={16} /> 保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑商品弹窗 */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative space-y-4">
            <button
              onClick={() => setShowProductModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h4 className="text-lg font-semibold text-gray-900">
              {productModalMode === "add" ? "添加新商品" : "编辑商品"}
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品名称 <span className="text-red-500">*</span>
              </label>
              <input
                value={pname}
                onChange={(e) => setPname(e.target.value)}
                placeholder="请输入商品名称"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {!pname && (
                <p className="text-xs text-red-500 mt-1">商品名称为必填项</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品单价 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pprice}
                onChange={(e) => setPprice(e.target.value)}
                placeholder="请输入商品单价"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {!pprice && (
                <p className="text-xs text-red-500 mt-1">商品单价为必填项</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
              <select
                value={pbrand}
                onChange={(e) => setPbrand(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">请选择品牌</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
              <select
                value={punit}
                onChange={(e) => setPunit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">请选择单位</option>
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
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
                onClick={saveProduct}
                disabled={!pname || !pprice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PlusCircle size={16} />
                {productModalMode === "add" ? "确认添加" : "保存修改"}
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

      {/* 库存日志弹窗 */}
      {showStockLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative max-h-[90vh] overflow-hidden flex flex-col">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">库存变动日志</h4>
                  <p className="text-xs text-gray-500">记录所有库存入库与出库操作</p>
                </div>
              </div>
              <button
                onClick={() => setShowStockLogModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* 筛选条件 */}
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                  <Filter size={14} className="text-gray-400" />
                  <select
                    value={logFilterType}
                    onChange={(e) => {
                      setLogFilterType(e.target.value);
                      setStockLogs(getStockLogs({ 
                        type: e.target.value === "all" ? null : e.target.value 
                      }));
                    }}
                    className="text-sm bg-transparent border-none outline-none text-gray-700 cursor-pointer"
                  >
                    <option value="all">全部类型</option>
                    <option value="in">📥 入库</option>
                    <option value="out">📤 出库</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                  <Calendar size={14} className="text-gray-400" />
                  <input
                    type="date"
                    value={logFilterDateStart}
                    onChange={(e) => setLogFilterDateStart(e.target.value)}
                    className="text-sm bg-transparent border-none outline-none text-gray-700"
                  />
                  <span className="text-gray-300">-</span>
                  <input
                    type="date"
                    value={logFilterDateEnd}
                    onChange={(e) => setLogFilterDateEnd(e.target.value)}
                    className="text-sm bg-transparent border-none outline-none text-gray-700"
                  />
                </div>

                <div className="flex-1" />
                
                <button
                  onClick={() => {
                    setLogFilterType("all");
                    setLogFilterDateStart("");
                    setLogFilterDateEnd("");
                    setStockLogs(getStockLogs({}));
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                >
                  <RefreshCw size={14} />
                  重置筛选
                </button>
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="px-6 py-3 bg-white border-b border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">总记录数</p>
                  <p className="text-xl font-bold text-gray-800">{stockLogs.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-3 border border-green-100">
                  <p className="text-xs text-green-600 font-medium">入库次数</p>
                  <p className="text-xl font-bold text-gray-800">
                    {stockLogs.filter(l => l.type === "in").length}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-3 border border-orange-100">
                  <p className="text-xs text-orange-600 font-medium">出库次数</p>
                  <p className="text-xl font-bold text-gray-800">
                    {stockLogs.filter(l => l.type === "out").length}
                  </p>
                </div>
              </div>
            </div>

            {/* 日志表格 */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-600 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">时间</th>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">类型</th>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">商品</th>
                      <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">数量</th>
                      <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">变动前</th>
                      <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">变动后</th>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">操作人</th>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockLogs.length > 0 ? (
                      stockLogs.map((log, index) => (
                        <tr 
                          key={log.id} 
                          className={`hover:bg-blue-50/30 transition-colors duration-150 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-gray-400" />
                              {new Date(log.createTime).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              log.type === "in"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-orange-100 text-orange-700 border border-orange-200"
                            }`}>
                              {log.type === "in" ? (
                                <><ArrowUpRight size={12} />入库</>
                              ) : (
                                <><ArrowDownRight size={12} />出库</>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Package size={12} className="text-gray-500" />
                              </div>
                              <span className="font-medium text-gray-800">{log.productName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${
                              log.type === "in" ? "text-green-600" : "text-orange-600"
                            }`}>
                              {log.type === "in" ? "+" : "-"}{log.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">{log.beforeStock}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-gray-800">{log.afterStock}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <User size={12} className="text-gray-400" />
                              <span className="text-gray-600">{log.operator}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">
                            {log.remark || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-400">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                              <Clock size={32} className="text-gray-300" />
                            </div>
                            <p className="text-sm">暂无库存变动记录</p>
                            <p className="text-xs">进行入库或出库操作后将显示在这里</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                共 <span className="font-semibold text-gray-700">{stockLogs.length}</span> 条记录
                {logFilterType !== "all" && ` · 已筛选: ${logFilterType === "in" ? "入库" : "出库"}`}
              </p>
              <button
                onClick={() => setShowStockLogModal(false)}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-all duration-200 shadow-sm"
              >
                关闭
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

// 排序图标组件
const SortIcon = ({ field, financeSortField, financeSortOrder }) => {
  if (financeSortField !== field) return <SortAsc size={14} className="text-gray-300" />;
  return financeSortOrder === "asc" ? (
    <SortAsc size={14} className="text-blue-600" />
  ) : (
    <SortDesc size={14} className="text-blue-600" />
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
  _selectedCustomerDetail,
  setSelectedCustomerDetail,
  _showCustomerDetailModal,
  setShowCustomerDetailModal,
  customers,
  outRecords,
  _products,
  openPaymentModal,
  openPaymentRecordsModal,
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
  const _convertToCSV = (data) => {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => `"${val}"`)
        .join(",")
    );
    return [headers, ...rows].join("\n");
  };

  const _downloadCSV = (csv, filename) => {
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
                      客户名称 <SortIcon field="customerName" financeSortField={financeSortField} financeSortOrder={financeSortOrder} />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("totalAmount")}
                  >
                    <div className="flex items-center gap-1">
                      交易总额 <SortIcon field="totalAmount" financeSortField={financeSortField} financeSortOrder={financeSortOrder} />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">已付金额</th>
                  <th 
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("unpaidAmount")}
                  >
                    <div className="flex items-center gap-1">
                      未付金额 <SortIcon field="unpaidAmount" financeSortField={financeSortField} financeSortOrder={financeSortOrder} />
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
                      <div className="flex items-center justify-end gap-1">
                        {item.unpaidAmount > 0 && (
                          <button
                            onClick={() => openPaymentModal(item)}
                            className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <DollarSign size={14} /> 收款
                          </button>
                        )}
                        <button
                          onClick={() => openPaymentRecordsModal(item)}
                          className="px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Receipt size={14} /> 收款记录
                        </button>
                        <button
                          onClick={() => viewCustomerDetail(item)}
                          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          查看详情
                        </button>
                      </div>
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
                      欠款金额 <SortIcon field="debtAmount" financeSortField={financeSortField} financeSortOrder={financeSortOrder} />
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

// 收款弹窗组件
const PaymentModal = ({ show, onClose, paymentForm, setPaymentForm, onSubmit, numberToChinese }) => {
  if (!show) return null;

  const amount = parseFloat(paymentForm.amount) || 0;
  const discount = parseFloat(paymentForm.discount) || 0;
  const actualAmount = Math.max(0, amount - discount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">客户收款</h4>
              <p className="text-xs text-gray-500">{paymentForm.customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="px-6 py-6 space-y-5">
          {/* 收款金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收款金额 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentForm.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaymentForm({ ...paymentForm, amount: val });
                }}
                placeholder="请输入收款金额"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              />
            </div>
            {amount > 0 && (
              <p className="mt-1.5 text-xs text-gray-500">
                大写：{numberToChinese(amount)}
              </p>
            )}
          </div>

          {/* 优惠金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              优惠金额 <span className="text-gray-400 font-normal">(选填)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentForm.discount}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaymentForm({ ...paymentForm, discount: val });
                }}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* 实际应收金额 */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">实际应收金额</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  ¥{actualAmount.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white">
                <Receipt size={24} />
              </div>
            </div>
            {actualAmount > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                大写：{numberToChinese(actualAmount)}
              </p>
            )}
          </div>

          {/* 支付方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付方式 <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
            >
              <option value="cash">💵 现金</option>
              <option value="bank">🏦 银行转账</option>
              <option value="wechat">💚 微信支付</option>
              <option value="alipay">🔵 支付宝</option>
              <option value="other">📝 其他</option>
            </select>
          </div>

          {/* 交易流水号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              交易流水号 <span className="text-gray-400 font-normal">(选填)</span>
            </label>
            <input
              type="text"
              value={paymentForm.transactionNo}
              onChange={(e) => setPaymentForm({ ...paymentForm, transactionNo: e.target.value })}
              placeholder="请输入交易流水号"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
            />
          </div>

          {/* 业务时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              业务时间 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                value={paymentForm.businessTime}
                onChange={(e) => setPaymentForm({ ...paymentForm, businessTime: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注 <span className="text-gray-400 font-normal">(选填)</span>
            </label>
            <textarea
              value={paymentForm.remark}
              onChange={(e) => setPaymentForm({ ...paymentForm, remark: e.target.value })}
              placeholder="请输入备注信息"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={!amount || amount <= 0}
            className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckCircle2 size={16} /> 确认收款
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;