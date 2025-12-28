import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Settings,
    BarChart3,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    Shield,
    CircleDollarSign,
    Share,
    ShoppingCart,
    Workflow,
    Users,
    ChartScatter,
    Package,
    PlusCircle,
    ShoppingBag,
    TrendingDown,
    Crown,
    Calendar
} from 'lucide-react';
import logo from '../assets/suitpress-logo.png';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    href?: string;
    children?: SidebarItem[];
    isPremium?: boolean;
    premiumLabel?: string;
}

interface SidebarProps {
    isExpanded: boolean;
    onToggle: () => void;
}

const getSidebarItems = (userRole?: string, hasModuleAccess?: (module: string) => boolean): SidebarItem[] => {
    const baseItems: SidebarItem[] = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <LayoutDashboard className="w-5 h-5" />,
            href: '/dashboard'
        }
    ];

    // Items para todos los roles (con verificación de permisos)
    const commonItems: SidebarItem[] = [
        {
            id: 'services',
            label: 'Servicios',
            icon: <Share className="w-5 h-5" />,
            href: '/servicios/registrar'
        },
        {
            id: 'productos',
            label: 'Productos',
            icon: <Package className="w-5 h-5" />,
            href: '/productos'
        },
        {
            id: 'ventas',
            label: 'Ventas',
            icon: <ShoppingBag className="w-5 h-5" />,
            href: '/ventas'
        },
        {
            id: 'inventario',
            label: 'Inventario',
            icon: <Package className="w-5 h-5" />,
            href: '/inventario/lista',
        },
        {
            id: 'ingresos-adicionales',
            label: 'Ingresos Adicionales',
            icon: <PlusCircle className="w-5 h-5" />,
            href: '/ingresos-adicionales'
        },
        {
            id: 'agendas',
            label: 'Agendas',
            icon: <Calendar className="w-5 h-5" />,
            href: '/agendas',
        },
        {
            id: 'facturacion',
            label: 'Facturación',
            icon: <CircleDollarSign className="w-5 h-5" />,
            href: '/facturacion'
        }
    ];

    // Items solo para admin y supervisor (con verificación de permisos)
    const adminItems: SidebarItem[] = [
        {
            id: 'gastos',
            label: 'Gastos',
            icon: <TrendingDown className="w-5 h-5" />,
            href: '/gastos'
        },
        {
            id: 'shops',
            label: 'Pagos',
            icon: <CircleDollarSign className="w-5 h-5" />,
            href: '/pagos/registrar'
        },
        {
            id: 'reportes',
            label: 'Reportes',
            icon: <BarChart3 className="w-5 h-5" />,
            children: [
                {
                    id: 'analytics',
                    label: 'Analytics',
                    icon: <ChartScatter className="w-4 h-4" />,
                    href: '/reportes/analytics'
                }
            ]
        },
        {
            id: 'admin',
            label: 'Administración',
            icon: <Settings className="w-5 h-5" />,
            children: [
                {
                    id: 'lista-services',
                    label: 'Lista de Servicios',
                    icon: <ShoppingCart className="w-5 h-5" />,
                    href: '/servicios/lista'
                },
                {
                    id: 'lista-operadores',
                    label: 'Lista de Operadores',
                    icon: <Users className="w-4 h-4" />,
                    href: '/operadores/lista'
                },
                {
                    id: 'roles',
                    label: 'Roles y Permisos',
                    icon: <Shield className="w-4 h-4" />,
                    href: '/roles-permisos'
                },
                {
                    id: 'modulos-premium',
                    label: 'Módulos Premium',
                    icon: <Crown className="w-4 h-4" />,
                    href: '/modulos-entidades'
                },
                {
                    id: 'integrations',
                    label: 'Integraciones',
                    icon: <Workflow className="w-4 h-4" />,
                    href: '/usuarios/roles'
                }
            ]
        }
    ];

    // Filtrar items basado en permisos
    const filterItemsByPermissions = (items: SidebarItem[]): SidebarItem[] => {
        return items.filter(item => {
            // Si no hay función de verificación de permisos, mostrar todo
            if (!hasModuleAccess) return true;

            // Mapear IDs de items a módulos
            const moduleMap: { [key: string]: string } = {
                'dashboard': 'dashboard',
                'services': 'servicios',
                'productos': 'productos',
                'ventas': 'ventas',
                'inventario': 'inventario',
                'ingresos-adicionales': 'ingresos_adicionales',
                'agendas': 'agendas',
                'gastos': 'gastos',
                'shops': 'pagos',
                'reportes': 'reportes',
                'modulos-premium': 'modulos_entidades'
            };

            const moduleName = moduleMap[item.id];
            if (!moduleName) {
                // Para items sin mapeo directo (como 'admin'), verificar si tienen children con permisos
                if (item.children) {
                    return true; // Permitir que se evalúe en el map siguiente
                }
                return true; // Si no hay mapeo y no tiene children, mostrar por defecto
            }

            return hasModuleAccess(moduleName);
        }).map(item => {
            // Filtrar también los children si existen
            if (item.children) {
                return {
                    ...item,
                    children: item.children.filter(child => {
                        const childModuleMap: { [key: string]: string } = {
                            'lista-services': 'servicios',
                            'lista-operadores': 'operadores',
                            'roles': 'usuarios',
                            'modulos-premium': 'modulos_entidades',
                            'integrations': 'usuarios',
                            'analytics': 'reportes'
                        };

                        const childModuleName = childModuleMap[child.id];
                        if (!childModuleName) return true;

                        return !hasModuleAccess || hasModuleAccess(childModuleName);
                    })
                };
            }
            return item;
        }).filter(item => {
            // Remover items que no tienen children válidos
            if (item.children && item.children.length === 0) {
                return false;
            }
            return true;
        });
    };

    // Si es admin, mostrar todos los items (admin tiene todos los permisos)
    if (userRole === 'admin') {
        return [...baseItems, ...commonItems, ...adminItems];
    }

    // Para otros roles, filtrar por permisos
    const filteredCommonItems = filterItemsByPermissions(commonItems);
    const filteredAdminItems = filterItemsByPermissions(adminItems);

    return [...baseItems, ...filteredCommonItems, ...filteredAdminItems];
};

const SidebarItem: React.FC<{
    item: SidebarItem;
    isExpanded: boolean;
    expandedItems: string[];
    onToggle: (id: string) => void;
    onNavigate: (href: string) => void;
    currentPath: string;
}> = ({ item, isExpanded, expandedItems, onToggle, onNavigate, currentPath }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemExpanded = expandedItems.includes(item.id);
    const isActive = item.href === currentPath;

    const handleClick = () => {
        if (hasChildren) {
            onToggle(item.id);
        } else if (item.href) {
            onNavigate(item.href);
        }
    };

    return (
        <div className="space-y-1">
            <div
                className={`
          flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 text-black
          ${isActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : hasChildren
                            ? 'hover:bg-blue-50 hover:text-blue-600'
                            : 'hover:bg-gray-100 hover:text-gray-700'
                    }
          ${isExpanded ? 'w-full' : 'w-12 justify-center'}
        `}
                onClick={handleClick}
            >
                <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-blue-600' : 'text-gray-600'}>{item.icon}</span>
                    {isExpanded && (
                        <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{item.label}</span>
                            {item.isPremium && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                    {item.premiumLabel || 'NEW'}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {hasChildren && isExpanded && (
                    <span className="text-gray-400">
                        {isItemExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                )}
            </div>

            {hasChildren && isExpanded && isItemExpanded && (
                <div className="ml-6 space-y-1">
                    {item.children!.map((child) => {
                        const isChildActive = child.href === currentPath;
                        return (
                            <div
                                key={child.id}
                                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 text-black
                  ${isChildActive
                                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                        : 'hover:bg-gray-50 hover:text-gray-700'
                                    }
                `}
                                onClick={() => child.href && onNavigate(child.href)}
                            >
                                <span className={isChildActive ? 'text-blue-600' : 'text-gray-500'}>{child.icon}</span>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-sm">{child.label}</span>
                                    {child.isPremium && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                            {child.premiumLabel || 'NEW'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, onToggle }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { hasModuleAccess, isLoading } = usePermissions();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const toggleItem = (id: string) => {
        setExpandedItems(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const handleNavigate = (href: string) => {
        navigate(href);
    };

    const sidebarItems = getSidebarItems(user?.role?.nombre, hasModuleAccess);

    return (
        <div className={`
      bg-white shadow-lg transition-all duration-300 ease-in-out
      ${isExpanded ? 'w-64' : 'w-20'}
    `}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                {isExpanded && (
                    <img src={logo} alt="Logo Invarserapis" className='w-auto h-10 mx-auto' />
                )}
                <button
                    onClick={onToggle}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-black"
                >
                    {isExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    sidebarItems.map((item) => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            isExpanded={isExpanded}
                            expandedItems={expandedItems}
                            onToggle={toggleItem}
                            onNavigate={handleNavigate}
                            currentPath={location.pathname}
                        />
                    ))
                )}
            </nav>
        </div>
    );
};

export default Sidebar; 