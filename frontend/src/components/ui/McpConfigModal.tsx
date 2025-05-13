import { useState, useEffect } from 'react';
import { DefaultError, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../util/api';
import { McpConfig, McpTool, PreconfiguredMcpConfig } from '../../types'; // Import McpConfig and McpTool
import { FormErrors } from './FormErrors';
import { Switch } from '@headlessui/react';
import LoadingSpinner from './LoadingSpinner';

type EditConfigType = {
    id: string | null // null means a new config is being created
    name: string
    url: string
};

interface KnownPreconfigured {
    code: string
    name: string
}

const knownPreconfigured: KnownPreconfigured[] = [
    {
        code: 'fetch',
        name: 'Fetch',
    },
    {
        code: 'sequentialthinking',
        name: 'Sequential Thinking',
    },
]

type Preconfigured = (PreconfiguredMcpConfig | (KnownPreconfigured & { enabled: false }))

export function McpConfigModal() {
    const [configs, setConfigs] = useState<McpConfig[]>([]);
    const [editingConfig, setEditingConfig] = useState<EditConfigType | null>(null);

    const [preconfigured, setPreconfigured] = useState<Preconfigured[]>([]);

    const { mutate: togglePreconfigured, isPending: toggleLoading, error: togglePreconfiguredError } = useMutation<PreconfiguredMcpConfig, DefaultError, { code: string, enabled: boolean }>({
        mutationFn: ({ code, enabled }) => apiFetch('POST', `/mcp-configs/preconfigured/${code}/toggle`, { enabled: enabled }),
        onSuccess: (data) => {
            const newItems = [...preconfigured]
            const found = preconfigured.find(item => item.code === data.code)
            if (found) {
                newItems[newItems.indexOf(found)] = { ...data, name: found.name }
            }

            setPreconfigured(newItems);
        }
    })

    const { data: preconfiguredConfigs, error: preconfiguredConfigsError, isLoading: isPreconfiguredConfigsLoading } = useQuery<PreconfiguredMcpConfig[], Error>({
        queryKey: ['preconfigured-configs'],
        queryFn: () => apiFetch<PreconfiguredMcpConfig[]>('GET', '/mcp-configs/preconfigured'),
    });

    useEffect(() => {
        if (!preconfiguredConfigs) {
            return;
        }

        const sett: Preconfigured[] = preconfiguredConfigs.map((item => ({ ...item })));

        for (const item of knownPreconfigured) {
            const found = sett.find((current) => current.code === item.code);

            if (!found) {
                sett.unshift({
                    code: item.code,
                    name: item.name,
                    enabled: false,
                })
            } else {
                found.name = item.name;
            }
        }

        setPreconfigured(sett)
    }, [preconfiguredConfigs]);

    // Fetch MCP configurations using React Query
    const { data: fetchedMcpConfigs, error: mcpConfigsError } = useQuery<McpConfig[], Error>({
        queryKey: ['mcp-configs'],
        queryFn: () => apiFetch<McpConfig[]>('GET', '/mcp-configs'),
    });

    useEffect(() => {
        if (fetchedMcpConfigs) {
            setConfigs(fetchedMcpConfigs);
        }
    }, [fetchedMcpConfigs]);

    const addConfig = () => {
        setEditingConfig({
            id: null,
            name: '',
            url: '',
        });
    };

    const queryClient = useQueryClient();

    const saveConfig = useMutation<McpConfig, DefaultError, EditConfigType>({
        mutationFn: (cfg) => cfg.id
            ? apiFetch('PUT', `/mcp-configs/${cfg.id}`, cfg)
            : apiFetch('POST', '/mcp-configs', cfg),
        onSuccess(newCfg, editedCfg) {
            if (editedCfg.id) {
                setConfigs(prev => prev.map(config =>
                    config.id === editedCfg.id ? newCfg : config
                ));
            } else {
                setConfigs(prev => [...prev, newCfg])
            }

            setEditingConfig(null)
            queryClient.invalidateQueries({ queryKey: ['mcp-tool', newCfg.id] });
            saveConfig.reset();
        }
    });

    const reset = saveConfig.reset;

    useEffect(() => {
        reset();
    }, [editingConfig, reset]);

    const deleteConfig = useMutation<void, DefaultError, string>({
        mutationFn: (id) => apiFetch('DELETE', `/mcp-configs/${id}`),
        onSuccess(_, id) {
            const updatedConfigs = configs.filter(config => config.id !== id);
            setConfigs(updatedConfigs);
            deleteConfig.reset();
            setEditingConfig(null);
        }
    })

    return (
        <div className="">
            <div className="">
                <p className="text-sm text-gray-600 mb-6">
                    Add Model Context Protocol (MCP) servers to extend the capabilities of your chat platform.
                </p>

                {editingConfig === null ? (
                    // Index View
                    <div className="space-y-4">
                        <h3>Preconfigured servers {toggleLoading && (<LoadingSpinner size='sm' />)}</h3>
                        <div>
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                {isPreconfiguredConfigsLoading && <LoadingSpinner />}

                                {preconfigured.map((server, i) => (
                                    <div key={i} className="border border-gray-200 rounded-md p-4 bg-zinc-100 shadow">
                                        <div className="flex flex-row justify-between space-x-4">
                                            <div className="text-md">{server.name}</div>
                                            <Switch
                                                checked={server.enabled}
                                                onChange={() => togglePreconfigured({ code: server.code, enabled: !server.enabled })}
                                                disabled={toggleLoading}
                                                className={`${server.enabled ? 'bg-blue-600' : 'bg-gray-200'
                                                    } relative inline-flex h-6 w-11 items-center rounded-full`}
                                            >
                                                <span className="sr-only">Enable notifications</span>
                                                <span
                                                    className={`${server.enabled ? 'translate-x-6' : 'translate-x-1'
                                                        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                                                />
                                            </Switch>
                                        </div>
                                        {server.enabled && (<>
                                            <div className="text-xs font-medium text-gray-700 inline">Available Tools: </div>
                                            <div className="inline text-xs">
                                                {server.enabled && server.tools.map((tool, i) => (
                                                    <div className="inline" key={i}>
                                                        <strong title={tool.description || 'description is not set'}>{tool.name}</strong>
                                                        {i < server.tools.length - 1 && <>', '</>}
                                                    </div>
                                                ))}
                                            </div>
                                        </>)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <FormErrors error={mcpConfigsError || preconfiguredConfigsError || togglePreconfiguredError} />

                        <h3>Your servers</h3>
                        {configs.map((config) => (
                            <div key={config.id} className="border border-gray-200 rounded-md p-4 flex flex-col">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="min-w-0 mr-2">
                                        <div className="font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">{config.name || 'Unnamed Configuration'}</div>
                                        <div className="text-sm text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">{config.url || 'No URL'}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        onClick={() => setEditingConfig({ ...config })}
                                    >
                                        Edit
                                    </button>
                                </div>

                                {/* Display tools for this config */}
                                <ConfigToolsDisplay configId={config.id} />

                            </div>
                        ))}

                        <div className="text-center">
                            <button
                                type="button"
                                className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 max-w-60"
                                onClick={addConfig}
                            >
                                Add MCP Configuration
                            </button>
                        </div>
                    </div>
                ) : (
                    // Edit Form View
                    editingConfig && (
                        <form className="space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                saveConfig.mutate(editingConfig)
                            }}
                        >
                            <FormErrors error={saveConfig.error || deleteConfig.error} />
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Weather API"
                                    value={editingConfig.name}
                                    required
                                    onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Streamable HTTP URL</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., https://example.com/streamable-path"
                                    value={editingConfig.url}
                                    required
                                    onChange={(e) => setEditingConfig({ ...editingConfig, url: e.target.value })}
                                />
                            </div>

                            {/* Display tools for the config being edited */}
                            {editingConfig.id && <ConfigToolsDisplay configId={editingConfig.id} />}


                            <div className="flex justify-end space-x-3">
                                {saveConfig.isPending && <LoadingSpinner />}
                                {editingConfig.id && (
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                                        onClick={() => confirm('Are you sure?') && editingConfig.id && deleteConfig.mutate(editingConfig.id)}
                                    >
                                        Delete
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={saveConfig.isPending}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                                    onClick={() => setEditingConfig(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={saveConfig.isPending}
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                                >
                                    {editingConfig.id ? 'Save' : 'Add'}
                                </button>
                            </div>
                        </form>
                    )
                )}
            </div>
        </div>
    );
}

// New component to fetch and display tools for a specific config
interface ConfigToolsDisplayProps {
    configId: string;
}

function ConfigToolsDisplay({ configId }: ConfigToolsDisplayProps) {
    const { data: tools, isLoading, error } = useQuery<McpTool[], Error>({
        queryKey: ['mcp-tools', configId],
        queryFn: () => apiFetch<McpTool[]>('GET', `/mcp-configs/${configId}/tools`),
    });

    if (isLoading) {
        return <div className="text-sm text-gray-500">Loading tools...</div>;
    }

    if (error) {
        return <div className="text-sm text-red-500">Error loading tools: {error.message}</div>;
    }

    if (!tools || tools.length === 0) {
        return <div className="text-sm text-gray-500">No tools available for this config.</div>;
    }

    return (
        <div className="mt-3">
            <h3 className="text-xs font-medium text-gray-700 mb-1">Available Tools:</h3>
            <ul className="list-disc list-inside text-xs ml-2">
                {tools.map((tool, index) => (
                    <li key={index}>
                        <strong>{tool.name}</strong>: {tool.description || <em className="text-zinc-500">Description not set</em>}
                    </li>
                ))}
            </ul>
        </div>
    );
}
