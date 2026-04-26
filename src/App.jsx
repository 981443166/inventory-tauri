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
} from "lucide-react";

const API_BASE = "http://localhost:3001/api";

const App = () => {
  const [tab, setTab] = useState("stock");
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
        setOutRecords(outRecordsRes.map((r) => ({ ...r, time: r.createTime })));
      } catch (error) {
        console.error("加载数据失败:", error);
        alert('请求异常: ' + error.message);
      } 
    };
    fetchInitialData();
  }, []);

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
  });

  // 可搜索下拉相关状态
  const [inSearchText, setInSearchText] = useState("");
  const [inDropdownOpen, setInDropdownOpen] = useState(false);
  const [outSearchText, setOutSearchText] = useState("");
  const [outDropdownOpen, setOutDropdownOpen] = useState(false);
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

  // ---------- 出库 ----------
  const openOutModal = () => {
    setOutForm({ productId: "", quantity: "", remark: "" });
    setOutSearchText("");
    setOutDropdownOpen(false);
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
      setOutRecords(outRecsRes.map((r) => ({ ...r, time: r.createTime })));
      setShowOutModal(false);
      setOutForm({ productId: "", quantity: "", remark: "" });
      setOutSearchText("");
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
      setOutForm({ productId: "", quantity: "", remark: "" });
      setOutSearchText("");
    }
    setTimeout(() => setLoading(false), 500);
  };

  const menuList = [
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

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* 侧边栏 */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
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
      <main className="flex-1 flex flex-col overflow-hidden">
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

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                {tab === "products"
                  ? productSubTab === "list"
                    ? "商品列表"
                    : productSubTab === "brand"
                      ? "品牌管理"
                      : productSubTab === "category"
                        ? "商品分类"
                        : "单位管理"
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
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <RefreshCw size={24} className="animate-spin mr-2" />{" "}
                  加载中...
                </div>
              ) : (
                <>
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
                          {outRecords.length > 0 ? (
                            outRecords.map((r) => (
                              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-500">{r.productId}</td>
                                <td className="px-4 py-3 font-medium">{r.productName}</td>
                                <td className="px-4 py-3 text-red-500 font-medium">-{r.quantity}</td>
                                <td className="px-4 py-3 text-gray-500">{r.remark || "-"}</td>
                                <td className="px-4 py-3 text-gray-400">{r.time}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                暂无出库记录
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

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

export default App;