import { fetchDexPrice } from '../../src/utils/fetchDex'
import { getDexNodes, findDexPairConfig } from '../../src/config/dexes'
import { cache } from '../../src/utils/cache'

jest.mock('../../src/config/dexes')
jest.mock('../../src/utils/cache')

// Mock httpGET and httpPOST
global.httpGET = jest.fn()
global.httpPOST = jest.fn()

describe('fetchDexPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch DEX price successfully with GET request (legacy)', async () => {
    const mockFindDexPairConfig = findDexPairConfig as jest.MockedFunction<typeof findDexPairConfig>
    const mockGetDexNodes = getDexNodes as jest.MockedFunction<typeof getDexNodes>
    const mockCache = cache as jest.Mocked<typeof cache>

    // Mock configuration for GET request
    mockFindDexPairConfig.mockReturnValue({
      chain: 'tezos',
      config: {
        pair: 'TEST-PAIR',
        contract: 'KT1TestContract',
        rpcPath: '/chains/main/blocks/head/context/contracts/<<CONTRACT>>/storage',
        extractPriceData: (data: any) => ({
          timestamp: Date.now(),
          price: 1.5,
        }),
      }
    })

    mockGetDexNodes.mockReturnValue([{ id: 'test-node', url: 'https://test-node.com' }])

    // Mock cache
    mockCache.getAll.mockReturnValue([])
    mockCache.get.mockReturnValue(undefined)
    mockCache.set.mockImplementation(() => {})

    // Mock httpGET
    const mockHttpGET = global.httpGET as jest.MockedFunction<typeof global.httpGET>
    mockHttpGET.mockImplementation((url: string, headers: any, successCallback: Function) => {
      const mockResponse = JSON.stringify({ price: 1.5 })
      successCallback(mockResponse, 'test-certificate')
    })

    const result = await fetchDexPrice('TEST', 'PAIR')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      price: 1.5,
      exchangeId: 'test-node',
      certificate: 'test-certificate',
    })
  })

  it('should fetch DEX price successfully with POST request (view call)', async () => {
    const mockFindDexPairConfig = findDexPairConfig as jest.MockedFunction<typeof findDexPairConfig>
    const mockGetDexNodes = getDexNodes as jest.MockedFunction<typeof getDexNodes>
    const mockCache = cache as jest.Mocked<typeof cache>

    // Mock configuration for view call
    mockFindDexPairConfig.mockReturnValue({
      chain: 'tezos',
      config: {
        pair: 'STXTZ-XTZ',
        contract: 'KT1FRN2RmitUkyyovtjRMrU1G9zwKzgESXm8',
        viewCall: {
          viewName: 'fetch_price',
          input: { "prim": "Unit" },
          chain_id: 'NetXdQprcVkpaWU',
          unparsing_mode: 'Readable'
        },
        extractPriceData: (data: any) => ({
          timestamp: Date.now(),
          price: parseFloat(data.data.int),
        }),
      }
    })

    mockGetDexNodes.mockReturnValue([{ id: 'test-node', url: 'https://test-node.com' }])

    // Mock cache
    mockCache.getAll.mockReturnValue([])
    mockCache.get.mockReturnValue(undefined)
    mockCache.set.mockImplementation(() => {})

    // Mock httpPOST
    const mockHttpPOST = global.httpPOST as jest.MockedFunction<typeof global.httpPOST>
    mockHttpPOST.mockImplementation((url: string, headers: any, body: string, successCallback: Function) => {
      const mockResponse = JSON.stringify({ data: { int: "1011397" } })
      successCallback(mockResponse, 'test-certificate')
    })

    const result = await fetchDexPrice('STXTZ', 'XTZ')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      price: 1011397,
      exchangeId: 'test-node',
      certificate: 'test-certificate',
    })

    // Verify httpPOST was called with correct parameters
    expect(mockHttpPOST).toHaveBeenCalledWith(
      'https://test-node.com/chains/main/blocks/head/helpers/scripts/run_script_view',
      expect.stringContaining('"contract":"KT1FRN2RmitUkyyovtjRMrU1G9zwKzgESXm8"'),
      expect.objectContaining({
        'content-type': 'application/json',
      }),
      expect.any(Function),
      expect.any(Function)
    )
  })

  it('should handle view call with custom parameters', async () => {
    const mockFindDexPairConfig = findDexPairConfig as jest.MockedFunction<typeof findDexPairConfig>
    const mockGetDexNodes = getDexNodes as jest.MockedFunction<typeof getDexNodes>
    const mockCache = cache as jest.Mocked<typeof cache>

    // Mock configuration with custom view call parameters
    mockFindDexPairConfig.mockReturnValue({
      chain: 'tezos',
      config: {
        pair: 'CUSTOM-PAIR',
        contract: 'KT1CustomContract',
        viewCall: {
          viewName: 'custom_price',
          input: { "prim": "Pair", "args": [{ "int": "123" }, { "string": "test" }] },
          chain_id: 'NetXdQprcVkpaWU',
          unparsing_mode: 'Optimized'
        },
        extractPriceData: (data: any) => ({
          timestamp: Date.now(),
          price: parseFloat(data.data.string),
        }),
      }
    })

    mockGetDexNodes.mockReturnValue([{ id: 'custom-node', url: 'https://custom-node.com' }])

    // Mock cache
    mockCache.getAll.mockReturnValue([])
    mockCache.get.mockReturnValue(undefined)
    mockCache.set.mockImplementation(() => {})

    // Mock httpPOST
    const mockHttpPOST = global.httpPOST as jest.MockedFunction<typeof global.httpPOST>
    mockHttpPOST.mockImplementation((url: string, body: string, headers: any, successCallback: Function) => {
      const requestBody = JSON.parse(body)
      
      // Verify the request body contains custom parameters
      expect(requestBody.view).toBe('custom_price')
      expect(requestBody.unparsing_mode).toBe('Optimized')
      
      const mockResponse = JSON.stringify({ data: { string: "456.789" } })
      successCallback(mockResponse, 'custom-certificate')
    })

    const result = await fetchDexPrice('CUSTOM', 'PAIR')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      price: 456.789,
      exchangeId: 'custom-node',
      certificate: 'custom-certificate',
    })
  })

  it('should handle POST request errors', async () => {
    const mockFindDexPairConfig = findDexPairConfig as jest.MockedFunction<typeof findDexPairConfig>
    const mockGetDexNodes = getDexNodes as jest.MockedFunction<typeof getDexNodes>
    const mockCache = cache as jest.Mocked<typeof cache>

    mockFindDexPairConfig.mockReturnValue({
      chain: 'tezos',
      config: {
        pair: 'ERROR-PAIR',
        contract: 'KT1ErrorContract',
        viewCall: {
          viewName: 'error_view',
          input: { "prim": "Unit" },
        },
        extractPriceData: (data: any) => ({
          timestamp: Date.now(),
          price: parseFloat(data.data.int),
        }),
      }
    })

    mockGetDexNodes.mockReturnValue([{ id: 'error-node', url: 'https://error-node.com' }])
    mockCache.getAll.mockReturnValue([])
    mockCache.get.mockReturnValue(undefined)

    // Mock httpPOST to call error callback
    const mockHttpPOST = global.httpPOST as jest.MockedFunction<typeof global.httpPOST>
    mockHttpPOST.mockImplementation((url: string, body: string, headers: any, successCallback: Function, errorCallback: Function) => {
      errorCallback('Network error')
    })

    const result = await fetchDexPrice('ERROR', 'PAIR')
    expect(result).toEqual([])
  })

  it('should throw error if no configuration found', async () => {
    const mockFindDexPairConfig = findDexPairConfig as jest.MockedFunction<typeof findDexPairConfig>
    mockFindDexPairConfig.mockReturnValue(undefined)

    await expect(fetchDexPrice('INVALID', 'PAIR')).rejects.toThrow(
      'No DEX configuration found for pair INVALID-PAIR'
    )
  })

  it('should throw error if no nodes available', async () => {
    const mockFindDexPairConfig = findDexPairConfig as jest.MockedFunction<typeof findDexPairConfig>
    const mockGetDexNodes = getDexNodes as jest.MockedFunction<typeof getDexNodes>
    
    mockFindDexPairConfig.mockReturnValue({
      chain: 'tezos',
      config: {
        pair: 'STXTZ-XTZ',
        contract: 'KT1TestContract',
        rpcPath: '/test/path',
        extractPriceData: () => ({ timestamp: Date.now(), price: 1.5 }),
      }
    })

    mockGetDexNodes.mockReturnValue([])

    await expect(fetchDexPrice('STXTZ', 'XTZ')).rejects.toThrow(
      'No available nodes found for chain tezos'
    )
  })

  it('should use cached data when available', async () => {
    const mockFindDexPairConfig = findDexPairConfig as jest.MockedFunction<typeof findDexPairConfig>
    const mockGetDexNodes = getDexNodes as jest.MockedFunction<typeof getDexNodes>
    const mockCache = cache as jest.Mocked<typeof cache>

    mockFindDexPairConfig.mockReturnValue({
      chain: 'tezos',
      config: {
        pair: 'CACHED-PAIR',
        contract: 'KT1CachedContract',
        viewCall: {
          viewName: 'cached_price',
          input: { "prim": "Unit" },
        },
        extractPriceData: (data: any) => ({
          timestamp: Date.now(),
          price: parseFloat(data.data.int),
        }),
      }
    })

    mockGetDexNodes.mockReturnValue([{ id: 'cached-node', url: 'https://cached-node.com' }])

    // Mock cache to return cached data
    mockCache.getAll.mockReturnValue([{
      price: 1.23,
      timestamp: Date.now(),
      sources: [{ exchangeId: 'cached-node', certificate: 'cached-cert' }]
    }])

    // Clear any previous httpPOST calls
    const mockHttpPOST = global.httpPOST as jest.MockedFunction<typeof global.httpPOST>
    mockHttpPOST.mockClear()

    const result = await fetchDexPrice('CACHED', 'PAIR')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      price: 1.23,
      exchangeId: 'cached-node',
      certificate: 'cached-cert',
    })

    // Verify that httpPOST was not called since we used cache
    expect(mockHttpPOST).not.toHaveBeenCalled()
  })
}) 