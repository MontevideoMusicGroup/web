$ErrorActionPreference = 'Stop'

$script:Root = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$script:RootPrefix = $script:Root.TrimEnd('\') + '\'
$script:DataDir = Join-Path $script:Root 'data'
$script:ProductsFile = Join-Path $script:DataDir 'products.json'
$script:ProductsJsonlFile = Join-Path $script:DataDir 'products.jsonl'
$script:AdminFile = Join-Path $script:DataDir 'admin.json'
$script:SiteContentFile = Join-Path $script:DataDir 'site-content.json'
$script:SalesFile = Join-Path $script:DataDir 'sales.json'
$script:ExpensesFile = Join-Path $script:DataDir 'expenses.json'
$script:OrdersFile = Join-Path $script:DataDir 'orders.json'
$script:OrdersJsonlFile = Join-Path $script:DataDir 'orders.jsonl'
$script:CategoriesFile = Join-Path $script:DataDir 'categories.json'
$script:CategoriesJsonlFile = Join-Path $script:DataDir 'categories.jsonl'
$script:OrderSettingsFile = Join-Path $script:DataDir 'order-settings.json'
$script:OrderSettingsJsonlFile = Join-Path $script:DataDir 'order-settings.jsonl'
$script:Sessions = @{}
$script:Utf8 = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath $script:DataDir)) {
  New-Item -ItemType Directory -Path $script:DataDir | Out-Null
}
if (-not (Test-Path -LiteralPath $script:ProductsFile)) {
  @'
[
  {
    "id": "epson-t544-black",
    "sku": "T544120-AL",
    "name": "Botella de tinta Epson 544 negra, 65 ml",
    "category": "Tintas",
    "description": "Tinta original Epson negra para impresoras EcoTank compatibles. Artículo y precio de ejemplo para probar la tienda.",
    "price": 14500,
    "image": "",
    "inkColor": "#252525",
    "active": true,
    "isSample": true
  },
  {
    "id": "epson-t544-cyan",
    "sku": "T544220-AL",
    "name": "Botella de tinta Epson 544 cian, 65 ml",
    "category": "Tintas",
    "description": "Tinta original Epson cian para impresoras EcoTank compatibles. Artículo y precio de ejemplo para probar la tienda.",
    "price": 14500,
    "image": "",
    "inkColor": "#00a6ce",
    "active": true,
    "isSample": true
  },
  {
    "id": "epson-t544-magenta",
    "sku": "T544320-AL",
    "name": "Botella de tinta Epson 544 magenta, 65 ml",
    "category": "Tintas",
    "description": "Tinta original Epson magenta para impresoras EcoTank compatibles. Artículo y precio de ejemplo para probar la tienda.",
    "price": 14500,
    "image": "",
    "inkColor": "#d70a75",
    "active": true,
    "isSample": true
  },
  {
    "id": "epson-t544-yellow",
    "sku": "T544420-AL",
    "name": "Botella de tinta Epson 544 amarilla, 65 ml",
    "category": "Tintas",
    "description": "Tinta original Epson amarilla para impresoras EcoTank compatibles. Artículo y precio de ejemplo para probar la tienda.",
    "price": 14500,
    "image": "",
    "inkColor": "#e6b800",
    "active": true,
    "isSample": true
  }
]
'@ | Set-Content -LiteralPath $script:ProductsFile -Encoding UTF8
}
if (-not (Test-Path -LiteralPath $script:SiteContentFile)) {
  $defaultContent = @{
    heroBadge = 'Más de 40 años acompañando a empresas y personas'
    heroAccent = 'tecnología'
    heroDescription = 'Soluciones tecnológicas para trabajar mejor: equipamiento, soporte, seguridad y herramientas digitales para tu negocio.'
  }
  [System.IO.File]::WriteAllText($script:SiteContentFile, (ConvertTo-Json -InputObject $defaultContent -Compress), $script:Utf8)
}
if (-not (Test-Path -LiteralPath $script:OrderSettingsFile)) {
  $settings = @{ whatsappTemplate = 'Hola {nombre}, recibimos tu pedido de {cantidad} {unidades} de {producto}. Te esperamos para retirarlo o coordinamos la entrega.' }
  [System.IO.File]::WriteAllText($script:OrderSettingsFile, (ConvertTo-Json -InputObject $settings -Compress), $script:Utf8)
}
if (-not (Test-Path -LiteralPath $script:CategoriesFile)) {
  @'
[
  {"id":"tintas","name":"Tintas","parentId":"","active":true,"sortOrder":10},
  {"id":"tintas-epson","name":"Epson","parentId":"tintas","active":true,"sortOrder":10},
  {"id":"tintas-hp","name":"HP","parentId":"tintas","active":true,"sortOrder":20},
  {"id":"tintas-canon","name":"Canon","parentId":"tintas","active":true,"sortOrder":30},
  {"id":"tintas-brother","name":"Brother","parentId":"tintas","active":true,"sortOrder":40},
  {"id":"cartuchos","name":"Cartuchos","parentId":"","active":true,"sortOrder":20},
  {"id":"impresoras","name":"Impresoras","parentId":"","active":true,"sortOrder":30},
  {"id":"toners","name":"Toners","parentId":"","active":true,"sortOrder":40},
  {"id":"insumos","name":"Insumos de impresión","parentId":"","active":true,"sortOrder":50},
  {"id":"accesorios","name":"Accesorios","parentId":"","active":true,"sortOrder":60},
  {"id":"repuestos","name":"Repuestos","parentId":"","active":true,"sortOrder":70},
  {"id":"otros","name":"Otros productos","parentId":"","active":true,"sortOrder":80}
]
'@ | Set-Content -LiteralPath $script:CategoriesFile -Encoding UTF8
}

function Get-JsonlPath {
  param([string]$JsonPath)
  if (-not $JsonPath) { return $null }
  return [System.IO.Path]::ChangeExtension($JsonPath, '.jsonl')
}

function Normalize-JsonCollection {
  param($Value)
  if ($null -eq $Value) { return @() }
  if ($Value -is [string]) { return @($Value) }

  $items = New-Object System.Collections.Generic.List[object]
  $queue = New-Object System.Collections.Generic.Queue[object]
  $queue.Enqueue($Value)

  while ($queue.Count -gt 0) {
    $current = $queue.Dequeue()
    if ($null -eq $current) { continue }
    if ($current -is [System.Array]) {
      foreach ($entry in @($current)) {
        if ($null -ne $entry) { $queue.Enqueue($entry) }
      }
      continue
    }
    if ($current -is [System.Collections.IEnumerable] -and -not ($current -is [string])) {
      foreach ($entry in @($current)) {
        if ($null -ne $entry) { $queue.Enqueue($entry) }
      }
      continue
    }
    [void]$items.Add($current)
  }

  return [object[]]$items.ToArray()
}

function Read-JsonlRecords {
  param([string]$JsonlPath)
  if (-not (Test-Path -LiteralPath $JsonlPath)) { return @() }
  $lines = [System.IO.File]::ReadAllLines($JsonlPath, $script:Utf8)
  $items = @()
  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try {
      $item = ConvertFrom-Json -InputObject $line
      $items = @($items + @(Normalize-JsonCollection -Value $item))
    } catch { }
  }
  return [object[]](Normalize-JsonCollection -Value $items)
}

function Write-JsonlRecords {
  param([string]$JsonlPath, [object[]]$Entries)
  if (-not $JsonlPath) { return }
  $items = @($Entries)
  if ($items.Count -eq 0) {
    [System.IO.File]::WriteAllText($JsonlPath, '', $script:Utf8)
    return
  }
  $lines = @()
  foreach ($entry in $items) {
    if ($null -eq $entry) { continue }
    $lines += (ConvertTo-Json -InputObject $entry -Depth 20 -Compress)
  }
  [System.IO.File]::WriteAllLines($JsonlPath, $lines, $script:Utf8)
}

function Read-ProductList {
  $jsonlPath = Get-JsonlPath -JsonPath $script:ProductsFile
  if (Test-Path -LiteralPath $jsonlPath) {
    return @(Normalize-JsonCollection -Value (Read-JsonlRecords -JsonlPath $jsonlPath))
  }
  if (-not (Test-Path -LiteralPath $script:ProductsFile)) { return @() }
  $json = [System.IO.File]::ReadAllText($script:ProductsFile, $script:Utf8)
  $items = ConvertFrom-Json -InputObject $json
  return @(Normalize-JsonCollection -Value $items)
}

function Write-ProductList {
  param([object[]]$Items)
  $json = ConvertTo-Json -InputObject @($Items) -Depth 8
  $tempFile = $script:ProductsFile + '.tmp'
  [System.IO.File]::WriteAllText($tempFile, $json, $script:Utf8)
  Move-Item -LiteralPath $tempFile -Destination $script:ProductsFile -Force
  $jsonlPath = Get-JsonlPath -JsonPath $script:ProductsFile
  Write-JsonlRecords -JsonlPath $jsonlPath -Entries @($Items)
}

function Initialize-ProductSchema {
  $items = @(Read-ProductList)
  $defaults = @{
    subcategory = ''
    brand = ''
    model = ''
    color = ''
    capacity = ''
    compatibility = ''
    unitCost = 0
    salePrice = 0
    saleStartsAt = ''
    saleEndsAt = ''
  }
  $changed = $false
  foreach ($product in $items) {
    foreach ($field in @('stock', 'minStock', 'saleStock')) {
      if ($product.PSObject.Properties[$field]) {
        $product.PSObject.Properties.Remove($field)
        $changed = $true
      }
    }
    foreach ($field in $defaults.Keys) {
      if (-not $product.PSObject.Properties[$field]) {
        $product | Add-Member -NotePropertyName $field -NotePropertyValue $defaults[$field]
        $changed = $true
      }
    }
    if (-not $product.PSObject.Properties['createdAt']) {
      $product | Add-Member -NotePropertyName createdAt -NotePropertyValue ([DateTimeOffset]::Now.ToString('o'))
      $changed = $true
    }
    if ([string]$product.sku -like 'T544*' -and -not $product.brand) {
      $product.brand = 'Epson'
      $product.subcategory = 'Epson'
      $product.model = '544'
      $product.capacity = '65 ml'
      $product.compatibility = 'EcoTank L1110, L3110, L3150 y L5190'
      if ($product.name -match 'negra|cian|magenta|amarilla') { $product.color = $Matches[0] }
      $changed = $true
    }
    if ([string]$product.description -match 'precio y stock de ejemplo') {
      $product.description = [regex]::Replace([string]$product.description, 'precio y stock de ejemplo', 'precio de ejemplo', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $changed = $true
    }
  }
  if ($changed) { Write-ProductList -Items $items }
}

Initialize-ProductSchema

function Initialize-OrderSchema {
  $orders = @(Read-Ledger -Path $script:OrdersFile)
  $changed = $false
  foreach ($order in $orders) {
    if ($order.status -eq 'waiting-stock') {
      $order.status = 'ordered'
      $changed = $true
    }
    if ($order.PSObject.Properties['stockReserved']) {
      $order.PSObject.Properties.Remove('stockReserved')
      $changed = $true
    }
  }
  if ($changed) { Write-Ledger -Path $script:OrdersFile -Entries $orders }
}

function Read-SiteContent {
  return (ConvertFrom-Json -InputObject ([System.IO.File]::ReadAllText($script:SiteContentFile, $script:Utf8)))
}

function Write-SiteContent {
  param($Content)
  $tempFile = $script:SiteContentFile + '.tmp'
  [System.IO.File]::WriteAllText($tempFile, (ConvertTo-Json -InputObject $Content -Compress), $script:Utf8)
  Move-Item -LiteralPath $tempFile -Destination $script:SiteContentFile -Force
  $jsonlPath = Get-JsonlPath -JsonPath $script:SiteContentFile
  Write-JsonlRecords -JsonlPath $jsonlPath -Entries @($Content)
}

function Read-Ledger {
  param([string]$Path)
  $jsonlPath = Get-JsonlPath -JsonPath $Path
  if (Test-Path -LiteralPath $jsonlPath) {
    return @(Normalize-JsonCollection -Value (Read-JsonlRecords -JsonlPath $jsonlPath))
  }
  if (-not (Test-Path -LiteralPath $Path)) { return @() }
  $entries = ConvertFrom-Json -InputObject ([System.IO.File]::ReadAllText($Path, $script:Utf8))
  return @(Normalize-JsonCollection -Value $entries)
}

function Write-Ledger {
  param([string]$Path, [object[]]$Entries)
  $tempFile = $Path + '.tmp'
  [System.IO.File]::WriteAllText($tempFile, (ConvertTo-Json -InputObject @($Entries) -Depth 8), $script:Utf8)
  Move-Item -LiteralPath $tempFile -Destination $Path -Force
  $jsonlPath = Get-JsonlPath -JsonPath $Path
  Write-JsonlRecords -JsonlPath $jsonlPath -Entries @($Entries)
}

function Read-Categories {
  $items = ConvertFrom-Json -InputObject ([System.IO.File]::ReadAllText($script:CategoriesFile, $script:Utf8))
  return @(Normalize-JsonCollection -Value $items)
}

function Write-Categories {
  param([object[]]$Categories)
  Write-Ledger -Path $script:CategoriesFile -Entries $Categories
  Write-JsonlRecords -JsonlPath $script:CategoriesJsonlFile -Entries @($Categories)
}

function Read-OrderSettings {
  return (ConvertFrom-Json -InputObject ([System.IO.File]::ReadAllText($script:OrderSettingsFile, $script:Utf8)))
}

function Write-OrderSettings {
  param($Settings)
  $tempFile = $script:OrderSettingsFile + '.tmp'
  [System.IO.File]::WriteAllText($tempFile, (ConvertTo-Json -InputObject $Settings -Compress), $script:Utf8)
  Move-Item -LiteralPath $tempFile -Destination $script:OrderSettingsFile -Force
  Write-JsonlRecords -JsonlPath $script:OrderSettingsJsonlFile -Entries @($Settings)
}

foreach ($ledgerMigration in @(
  @{ OldName = 'inventory-sales'; NewPath = $script:SalesFile },
  @{ OldName = 'inventory-expenses'; NewPath = $script:ExpensesFile }
)) {
  $legacyJson = Join-Path $script:DataDir ($ledgerMigration.OldName + '.json')
  $legacyJsonl = Join-Path $script:DataDir ($ledgerMigration.OldName + '.jsonl')
  $targetJson = [string]$ledgerMigration.NewPath
  $targetJsonl = Get-JsonlPath -JsonPath $targetJson
  if (-not (Test-Path -LiteralPath $targetJson)) {
    if (Test-Path -LiteralPath $legacyJson) {
      Copy-Item -LiteralPath $legacyJson -Destination $targetJson
    }
  }
  if (-not (Test-Path -LiteralPath $targetJsonl)) {
    if (Test-Path -LiteralPath $legacyJsonl) {
      Copy-Item -LiteralPath $legacyJsonl -Destination $targetJsonl
    }
  }
}

foreach ($ledgerFile in @($script:SalesFile, $script:ExpensesFile, $script:OrdersFile)) {
  if (-not (Test-Path -LiteralPath $ledgerFile)) {
    [System.IO.File]::WriteAllText($ledgerFile, '[]', $script:Utf8)
  }
  $jsonlFile = Get-JsonlPath -JsonPath $ledgerFile
  if (-not (Test-Path -LiteralPath $jsonlFile)) {
    if (Test-Path -LiteralPath $ledgerFile) {
      $entries = @((ConvertFrom-Json -InputObject ([System.IO.File]::ReadAllText($ledgerFile, $script:Utf8)) -ErrorAction SilentlyContinue))
      Write-JsonlRecords -JsonlPath $jsonlFile -Entries $entries
    } else {
      [System.IO.File]::WriteAllText($jsonlFile, '', $script:Utf8)
    }
  }
}

Initialize-OrderSchema
$whatsappTemplate = [string](Read-OrderSettings).whatsappTemplate
if ($whatsappTemplate -like '*renovamos stock*' -or $whatsappTemplate -eq 'Hola {nombre}, ya recibimos tu pedido de {cantidad} {producto}. Te esperamos para retirarlo o coordinamos la entrega.') {
  Write-OrderSettings -Settings @{ whatsappTemplate = 'Hola {nombre}, recibimos tu pedido de {cantidad} {unidades} de {producto}. Te esperamos para retirarlo o coordinamos la entrega.' }
}

function ConvertTo-Slug {
  param([string]$Value)
  $normalized = $Value.Trim().Normalize([System.Text.NormalizationForm]::FormD)
  $builder = New-Object System.Text.StringBuilder
  foreach ($character in $normalized.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($character) -ne [Globalization.UnicodeCategory]::NonSpacingMark) { [void]$builder.Append($character) }
  }
  return ([regex]::Replace($builder.ToString().ToLowerInvariant(), '[^a-z0-9]+', '-').Trim('-'))
}

function Normalize-ArgentinePhone {
  param([string]$Phone)
  if ([string]::IsNullOrWhiteSpace($Phone)) { return $null }
  $digits = ([string]$Phone -replace '[^0-9]', '')
  if ([string]::IsNullOrWhiteSpace($digits)) { return $null }
  if ($digits.StartsWith('54')) { $digits = $digits.Substring(2) }
  elseif ($digits.StartsWith('0')) { $digits = $digits.Substring(1) }
  if ($digits -match '^(?:[1-9]\d{2}\d{7,8}|9[1-9]\d{9})$') { return "+54$digits" }
  return $null
}

function Test-ArgentineE164 {
  param([string]$Phone)
  return (-not [string]::IsNullOrWhiteSpace((Normalize-ArgentinePhone -Phone $Phone)))
}

function Get-OrderStatusLabel {
  param([string]$Status)
  switch ($Status) {
    'ordered' { 'Encargado' }
    'ready' { 'Listo para entregar' }
    'delivered' { 'Entregado' }
    default { 'Encargado' }
  }
}

function Get-CurrentSalePrice {
  param($Product)
  if ([decimal]$Product.salePrice -le 0 -or [decimal]$Product.salePrice -ge [decimal]$Product.price) {
    return [decimal]$Product.price
  }
  try {
    $now = [DateTimeOffset]::Now
    $startsAt = [DateTimeOffset]::Parse([string]$Product.saleStartsAt)
    $endsAt = [DateTimeOffset]::Parse([string]$Product.saleEndsAt)
    if ($now -ge $startsAt -and $now -lt $endsAt) { return [decimal]$Product.salePrice }
  } catch { }
  return [decimal]$Product.price
}

function New-ConfirmedSale {
  param($Product, [int]$Quantity, [decimal]$UnitPrice, [string]$Channel, [string]$Note, [string]$OrderId = '')
  $unitCost = [decimal]$Product.unitCost
  $costKnown = $unitCost -gt 0
  $costOfGoods = if ($costKnown) { $unitCost * $Quantity } else { $null }
  $grossProfit = if ($costKnown) { ($UnitPrice * $Quantity) - $costOfGoods } else { $null }
  return @{
    id = [guid]::NewGuid().ToString('N')
    orderId = $OrderId
    productId = [string]$Product.id
    productName = [string]$Product.name
    quantity = $Quantity
    unitPrice = $UnitPrice
    unitCost = if ($costKnown) { $unitCost } else { $null }
    revenue = $UnitPrice * $Quantity
    costOfGoods = $costOfGoods
    grossProfit = $grossProfit
    costKnown = $costKnown
    confirmedAt = [DateTimeOffset]::Now.ToString('o')
    channel = $Channel
    note = $Note
  }
}

function Get-OrderStatusLabel {
  param([string]$Status)
  switch ($Status) {
    'ordered' { 'Encargado' }
    'ready' { 'Listo para entregar' }
    'delivered' { 'Entregado' }
    default { 'Encargado' }
  }
}

function Send-Json {
  param($Context, [int]$StatusCode, [object]$Value, [switch]$AsArray)
  if ($AsArray) {
    $items = Normalize-JsonCollection -Value $Value
    $json = if ($items.Count -eq 0) { '[]' } else { ConvertTo-Json -InputObject $items -Depth 10 -Compress }
  } else {
    $json = if ($null -eq $Value) { '[]' } else { ConvertTo-Json -InputObject $Value -Depth 10 -Compress }
  }
  $bytes = $script:Utf8.GetBytes($json)
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = 'application/json; charset=utf-8'
  $Context.Response.Headers['Cache-Control'] = 'no-store'
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.Close()
}

function Send-Empty {
  param($Context, [int]$StatusCode)
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.Headers['Cache-Control'] = 'no-store'
  $Context.Response.Close()
}

function Read-JsonBody {
  param($Context)
  if ($Context.Request.ContentLength64 -gt 6000000) {
    throw 'El archivo enviado supera el límite de 6 MB.'
  }
  $reader = New-Object System.IO.StreamReader($Context.Request.InputStream, $script:Utf8)
  try {
    $bodyText = $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
  if ([string]::IsNullOrWhiteSpace($bodyText)) { return @{} }
  return (ConvertFrom-Json -InputObject $bodyText)
}

function Test-AdminConfigured {
  return (Test-Path -LiteralPath $script:AdminFile)
}

function New-PasswordHash {
  param([string]$Secret, [string]$Salt)
  $saltBytes = [Convert]::FromBase64String($Salt)
  $derive = [System.Security.Cryptography.Rfc2898DeriveBytes]::new($Secret, $saltBytes, 310000)
  try {
    return [Convert]::ToBase64String($derive.GetBytes(32))
  } finally {
    $derive.Dispose()
  }
}

function Test-Password {
  param([string]$Actual, [string]$Expected)
  $actualBytes = $script:Utf8.GetBytes($Actual)
  $expectedBytes = $script:Utf8.GetBytes($Expected)
  $difference = $actualBytes.Length -bxor $expectedBytes.Length
  $limit = [Math]::Max($actualBytes.Length, $expectedBytes.Length)
  for ($index = 0; $index -lt $limit; $index++) {
    $actualByte = if ($index -lt $actualBytes.Length) { $actualBytes[$index] } else { 0 }
    $expectedByte = if ($index -lt $expectedBytes.Length) { $expectedBytes[$index] } else { 0 }
    $difference = $difference -bor ($actualByte -bxor $expectedByte)
  }
  return ($difference -eq 0)
}

function New-Session {
  param($Context)
  $sessionId = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $csrfToken = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $script:Sessions[$sessionId] = @{
    csrf = $csrfToken
    expires = [DateTime]::UtcNow.AddHours(8)
  }
  $cookie = "neyra_admin=$sessionId; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800"
  if ($Context.Request.Url.Scheme -eq 'https') { $cookie += '; Secure' }
  $Context.Response.Headers.Add('Set-Cookie', $cookie)
  return $csrfToken
}

function Clear-Session {
  param($Context, $SessionId)
  if ($SessionId) { $script:Sessions.Remove($SessionId) | Out-Null }
  $Context.Response.Headers.Add('Set-Cookie', 'neyra_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
}

function Get-Session {
  param($Context)
  $cookie = $Context.Request.Cookies['neyra_admin']
  if (-not $cookie) { return $null }
  $sessionId = $cookie.Value
  if (-not $script:Sessions.ContainsKey($sessionId)) { return $null }
  $session = $script:Sessions[$sessionId]
  if ($session.expires -lt [DateTime]::UtcNow) {
    $script:Sessions.Remove($sessionId) | Out-Null
    return $null
  }
  return @{ id = $sessionId; csrf = $session.csrf }
}

function Test-SameOrigin {
  param($Context)
  $origin = $Context.Request.Headers['Origin']
  if ([string]::IsNullOrWhiteSpace($origin)) { return $true }
  try {
    $originUri = [Uri]$origin
    return ($originUri.Authority -eq $Context.Request.Url.Authority -and $originUri.Scheme -eq $Context.Request.Url.Scheme)
  } catch {
    return $false
  }
}

function Get-AdminSession {
  param($Context, [bool]$RequireCsrf = $false)
  if (-not (Test-SameOrigin -Context $Context)) {
    Send-Json $Context 403 @{ error = 'Origen no permitido.' }
    return $null
  }
  $session = Get-Session -Context $Context
  if (-not $session) {
    Send-Json $Context 401 @{ error = 'Iniciá sesión para continuar.' }
    return $null
  }
  if ($RequireCsrf -and $Context.Request.Headers['X-CSRF-Token'] -ne $session.csrf) {
    Send-Json $Context 403 @{ error = 'Token de seguridad inválido.' }
    return $null
  }
  return $session
}

function Save-ProductImage {
  param([string]$ImageData)
  if ([string]::IsNullOrWhiteSpace($ImageData)) { return '' }
  if ($ImageData -notmatch '^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$') {
    throw 'La imagen debe ser PNG, JPG o WebP.'
  }
  $extension = switch ($Matches[1]) {
    'png' { '.png' }
    'jpeg' { '.jpg' }
    'webp' { '.webp' }
  }
  $bytes = [Convert]::FromBase64String($Matches[2])
  if ($bytes.Length -gt 4000000) { throw 'La imagen no puede superar los 4 MB.' }
  $imageDir = Join-Path $script:Root 'media/store'
  if (-not (Test-Path -LiteralPath $imageDir)) { New-Item -ItemType Directory -Path $imageDir | Out-Null }
  $fileName = [guid]::NewGuid().ToString('N') + $extension
  [System.IO.File]::WriteAllBytes((Join-Path $imageDir $fileName), $bytes)
  return "media/store/$fileName"
}

function ConvertTo-Product {
  param($Body, $Existing = $null)
  $name = ([string]$Body.name).Trim()
  $sku = ([string]$Body.sku).Trim()
  $category = ([string]$Body.category).Trim()
  $description = ([string]$Body.description).Trim()
  if (-not $name -or $name.Length -gt 140) { throw 'El nombre es obligatorio y admite hasta 140 caracteres.' }
  if (-not $category -or $category.Length -gt 60) { throw 'La categoría es obligatoria y admite hasta 60 caracteres.' }
  if ($description.Length -gt 1600) { throw 'La descripción admite hasta 1600 caracteres.' }
  $price = [decimal]::Parse([string]$Body.price, [System.Globalization.CultureInfo]::InvariantCulture)
  $unitCost = [decimal]::Parse([string]$Body.unitCost, [System.Globalization.CultureInfo]::InvariantCulture)
  $salePrice = if ($Body.salePrice) { [decimal]::Parse([string]$Body.salePrice, [System.Globalization.CultureInfo]::InvariantCulture) } else { [decimal]0 }
  if ($price -lt 0 -or $price -gt 1000000000) { throw 'El precio debe ser un importe válido.' }
  if ($unitCost -lt 0 -or $unitCost -gt 1000000000) { throw 'El costo unitario debe ser cero o mayor.' }
  if ($salePrice -gt 0) {
    if ($salePrice -ge $price) { throw 'El precio de oferta debe ser menor que el precio habitual.' }
    if (-not $Body.saleStartsAt -or -not $Body.saleEndsAt) { throw 'Una oferta necesita fecha de inicio y de fin.' }
    try {
      if ([DateTimeOffset]::Parse([string]$Body.saleEndsAt) -le [DateTimeOffset]::Parse([string]$Body.saleStartsAt)) { throw 'La fecha final debe ser posterior al inicio.' }
    } catch {
      throw 'Ingresá fechas válidas para la oferta.'
    }
  }
  $image = if ($Existing) { [string]$Existing.image } else { '' }
  if ($Body.imageData) {
    $image = Save-ProductImage -ImageData ([string]$Body.imageData)
  }
  return @{
    id = if ($Existing) { [string]$Existing.id } else { [guid]::NewGuid().ToString('N') }
    sku = $sku
    name = $name
    category = $category
    subcategory = ([string]$Body.subcategory).Trim()
    brand = ([string]$Body.brand).Trim()
    model = ([string]$Body.model).Trim()
    color = ([string]$Body.color).Trim()
    capacity = ([string]$Body.capacity).Trim()
    compatibility = ([string]$Body.compatibility).Trim()
    description = $description
    price = $price
    unitCost = $unitCost
    salePrice = $salePrice
    saleStartsAt = ([string]$Body.saleStartsAt).Trim()
    saleEndsAt = ([string]$Body.saleEndsAt).Trim()
    createdAt = if ($Existing -and $Existing.createdAt) { [string]$Existing.createdAt } else { [DateTimeOffset]::Now.ToString('o') }
    image = $image
    inkColor = if ($Body.inkColor -match '^#[0-9a-fA-F]{6}$') { [string]$Body.inkColor } else { '#2563eb' }
    active = [bool]$Body.active
    isSample = [bool]$Body.isSample
  }
}

function Get-ContentType {
  param([string]$Path)
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8' }
    '.css' { 'text/css; charset=utf-8' }
    '.js' { 'application/javascript; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.svg' { 'image/svg+xml' }
    '.png' { 'image/png' }
    '.jpg' { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.webp' { 'image/webp' }
    '.ico' { 'image/x-icon' }
    '.woff2' { 'font/woff2' }
    default { 'application/octet-stream' }
  }
}

function Send-StaticFile {
  param($Context, [string]$UrlPath)
  if ($UrlPath -match '(^|/)(data|\.git|backup_antes_de_quitar_stock_2026-10-23)(/|$)' -or $UrlPath -match '\.(ps1|tmp)$') {
    Send-Empty $Context 404
    return
  }
  $relativePath = switch ($UrlPath.TrimEnd('/')) {
    '' { 'index.html' }
    '/tienda' { 'tienda/index.html' }
    '/store' { 'tienda/index.html' }
    '/store/product.html' { 'tienda/product.html' }
    '/store/product.css' { 'tienda/product.css' }
    '/store/product.js' { 'tienda/product.js' }
    '/store/store.css' { 'tienda/store.css' }
    '/store/store.js' { 'tienda/store.js' }
    '/admin' { 'admin/index.html' }
    default { $UrlPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar) }
  }
  $fullPath = [System.IO.Path]::GetFullPath((Join-Path $script:Root $relativePath))
  if (-not $fullPath.StartsWith($script:RootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    Send-Empty $Context 403
    return
  }
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    Send-Empty $Context 404
    return
  }
  $bytes = [System.IO.File]::ReadAllBytes($fullPath)
  $Context.Response.StatusCode = 200
  $Context.Response.ContentType = Get-ContentType $fullPath
  $Context.Response.Headers['Cache-Control'] = 'no-store'
  $Context.Response.ContentLength64 = $bytes.Length
  if ($Context.Request.HttpMethod -ne 'HEAD') {
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  }
  $Context.Response.Close()
}

function Invoke-Request {
  param($Context)
  $request = $Context.Request
  $path = [Uri]::UnescapeDataString($request.Url.AbsolutePath)
  $method = $request.HttpMethod.ToUpperInvariant()

  if ($path -eq '/api/products' -and $method -eq 'GET') {
    $now = [DateTimeOffset]::Now
    $sales = @(Read-Ledger -Path $script:SalesFile)
    $items = @(foreach ($product in (Read-ProductList)) {
      if (-not $product.active) { continue }
      $saleActive = $false
      if ([decimal]$product.salePrice -gt 0 -and [decimal]$product.salePrice -lt [decimal]$product.price -and $product.saleStartsAt -and $product.saleEndsAt) {
        try {
          $startsAt = [DateTimeOffset]::Parse([string]$product.saleStartsAt)
          $endsAt = [DateTimeOffset]::Parse([string]$product.saleEndsAt)
          $saleActive = $now -ge $startsAt -and $now -lt $endsAt
        } catch {
          $saleActive = $false
        }
      }
      $salesForProduct = @($sales | Where-Object { $_.productId -eq $product.id })
      $salesCount = [int](($salesForProduct | Measure-Object -Property quantity -Sum).Sum)
      $product | Add-Member -NotePropertyName saleActive -NotePropertyValue $saleActive -Force
      $product | Add-Member -NotePropertyName effectivePrice -NotePropertyValue $(if ($saleActive) { [decimal]$product.salePrice } else { [decimal]$product.price }) -Force
      $product | Add-Member -NotePropertyName salesCount -NotePropertyValue $salesCount -Force
      $product
    })
    Send-Json $Context 200 $items -AsArray
    return
  }

  if ($path -match '^/api/products/([a-zA-Z0-9_-]+)$' -and $method -eq 'GET') {
    $productId = $Matches[1]
    $product = @(Read-ProductList | Where-Object { $_.id -eq $productId -and $_.active }) | Select-Object -First 1
    if (-not $product) { Send-Json $Context 404 @{ error = 'Producto no encontrado.' }; return }
    $product | Add-Member -NotePropertyName effectivePrice -NotePropertyValue (Get-CurrentSalePrice -Product $product) -Force
    $product | Add-Member -NotePropertyName saleActive -NotePropertyValue ((Get-CurrentSalePrice -Product $product) -lt [decimal]$product.price) -Force
    $sales = @(Read-Ledger -Path $script:SalesFile | Where-Object { $_.productId -eq $productId })
    $product | Add-Member -NotePropertyName salesCount -NotePropertyValue ([int](($sales | Measure-Object -Property quantity -Sum).Sum)) -Force
    Send-Json $Context 200 $product
    return
  }

  if ($path -eq '/api/categories' -and $method -eq 'GET') {
    $categories = @(Read-Categories | Where-Object { $_.active } | Sort-Object sortOrder, name)
    Send-Json $Context 200 $categories -AsArray
    return
  }

  if ($path -eq '/api/admin/categories' -and $method -eq 'GET') {
    if (-not (Get-AdminSession -Context $Context)) { return }
    Send-Json $Context 200 (Read-Categories | Sort-Object sortOrder, name)
    return
  }

  if ($path -eq '/api/admin/categories/reorder' -and $method -eq 'POST') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $body = Read-JsonBody -Context $Context
    $categories = @(Read-Categories)
    $order = @($body.ids)
    if ($order.Count -ne $categories.Count -or @($order | Select-Object -Unique).Count -ne $categories.Count) { throw 'La lista de categorías no coincide con las categorías guardadas.' }
    for ($index = 0; $index -lt $order.Count; $index++) {
      $category = $categories | Where-Object { $_.id -eq [string]$order[$index] } | Select-Object -First 1
      if (-not $category) { throw 'La lista contiene una categoría inexistente.' }
      $category.sortOrder = ($index + 1) * 10
    }
    Write-Categories -Categories ($categories | Sort-Object sortOrder)
    Send-Json $Context 200 (Read-Categories | Sort-Object sortOrder, name)
    return
  }

  if ($path -eq '/api/admin/categories' -and $method -eq 'POST') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $body = Read-JsonBody -Context $Context
    $name = ([string]$body.name).Trim()
    $parentId = ([string]$body.parentId).Trim()
    if (-not $name -or $name.Length -gt 60) { throw 'El nombre de categoría es obligatorio y admite hasta 60 caracteres.' }
    $categories = @(Read-Categories)
    if ($parentId -and -not ($categories | Where-Object { $_.id -eq $parentId -and -not $_.parentId })) { throw 'La categoría principal no existe.' }
    if ($categories | Where-Object { $_.parentId -eq $parentId -and $_.name -eq $name }) { Send-Json $Context 409 @{ error = 'Ya existe esa categoría en este nivel.' }; return }
    $baseId = ConvertTo-Slug -Value $name
    $id = if ($parentId) { "$parentId-$baseId" } else { $baseId }
    if ($categories | Where-Object { $_.id -eq $id }) { Send-Json $Context 409 @{ error = 'Ya existe una categoría con ese nombre.' }; return }
    $sortOrder = if ($body.sortOrder) { [int]$body.sortOrder } else { ((@($categories | Where-Object { $_.parentId -eq $parentId } | Measure-Object -Property sortOrder -Maximum).Maximum) + 10) }
    $category = @{ id = $id; name = $name; parentId = $parentId; active = $true; sortOrder = $sortOrder }
    Write-Categories -Categories (@($categories) + @($category))
    Send-Json $Context 201 $category
    return
  }

  if ($path -match '^/api/admin/categories/([a-zA-Z0-9_-]+)$') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $categoryId = $Matches[1]
    $categories = @(Read-Categories)
    $category = $categories | Where-Object { $_.id -eq $categoryId } | Select-Object -First 1
    if (-not $category) { Send-Json $Context 404 @{ error = 'No encontramos esa categoría.' }; return }
    if ($method -eq 'PUT') {
      $body = Read-JsonBody -Context $Context
      $oldName = [string]$category.name
      $newName = ([string]$body.name).Trim()
      if (-not $newName -or $newName.Length -gt 60) { throw 'El nombre de categoría es obligatorio y admite hasta 60 caracteres.' }
      if ($categories | Where-Object { $_.id -ne $categoryId -and $_.parentId -eq $category.parentId -and $_.name -eq $newName }) { Send-Json $Context 409 @{ error = 'Ya existe esa categoría en este nivel.' }; return }
      $category.name = $newName
      $category.active = [bool]$body.active
      $productList = @(Read-ProductList)
      foreach ($product in $productList) {
        $field = if ($category.parentId) { 'subcategory' } else { 'category' }
        if ([string]$product.$field -eq $oldName) { $product.$field = $newName }
      }
      Write-ProductList -Items $productList
      Write-Categories -Categories $categories
      Send-Json $Context 200 $category
      return
    }
    if ($method -eq 'DELETE') {
      if ($categories | Where-Object { $_.parentId -eq $categoryId }) { Send-Json $Context 409 @{ error = 'Primero mové o eliminá las subcategorías.' }; return }
      $productList = @(Read-ProductList)
      if ($productList | Where-Object { $_.category -eq $category.name -or $_.subcategory -eq $category.name }) { Send-Json $Context 409 @{ error = 'Hay productos asignados. Reasignalos antes de eliminar la categoría.' }; return }
      Write-Categories -Categories @($categories | Where-Object { $_.id -ne $categoryId })
      Send-Empty $Context 204
      return
    }
    Send-Empty $Context 405
    return
  }

  if ($path -eq '/api/site-content' -and $method -eq 'GET') {
    Send-Json $Context 200 (Read-SiteContent)
    return
  }

  if ($path -eq '/api/admin/session' -and $method -eq 'GET') {
    $session = Get-Session -Context $Context
    if ($session) {
      Send-Json $Context 200 @{ authenticated = $true; csrfToken = $session.csrf }
    } else {
      Send-Json $Context 200 @{ authenticated = $false; setupRequired = (-not (Test-AdminConfigured)) }
    }
    return
  }

  if ($path -eq '/api/admin/setup' -and $method -eq 'POST') {
    if (-not (Test-SameOrigin -Context $Context)) {
      Send-Json $Context 403 @{ error = 'Origen no permitido.' }
      return
    }
    if (Test-AdminConfigured) {
      Send-Json $Context 409 @{ error = 'El administrador ya fue configurado.' }
      return
    }
    $body = Read-JsonBody -Context $Context
    $password = [string]$body.password
    if ($password.Length -lt 12) {
      Send-Json $Context 400 @{ error = 'Usá una contraseña de al menos 12 caracteres.' }
      return
    }
    $salt = New-Object byte[] 24
    [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($salt)
    $saltText = [Convert]::ToBase64String($salt)
    $admin = @{ salt = $saltText; hash = (New-PasswordHash -Secret $password -Salt $saltText); iterations = 310000 }
    [System.IO.File]::WriteAllText($script:AdminFile, (ConvertTo-Json -InputObject $admin -Compress), $script:Utf8)
    $csrf = New-Session -Context $Context
    Send-Json $Context 201 @{ authenticated = $true; csrfToken = $csrf }
    return
  }

  if ($path -eq '/api/admin/login' -and $method -eq 'POST') {
    if (-not (Test-SameOrigin -Context $Context)) {
      Send-Json $Context 403 @{ error = 'Origen no permitido.' }
      return
    }
    if (-not (Test-AdminConfigured)) {
      Send-Json $Context 409 @{ setupRequired = $true; error = 'Configurá la contraseña de administración.' }
      return
    }
    $body = Read-JsonBody -Context $Context
    $admin = ConvertFrom-Json -InputObject ([System.IO.File]::ReadAllText($script:AdminFile, $script:Utf8))
    $candidate = New-PasswordHash -Secret ([string]$body.password) -Salt ([string]$admin.salt)
    if (-not (Test-Password -Actual $candidate -Expected ([string]$admin.hash))) {
      Start-Sleep -Milliseconds 500
      Send-Json $Context 401 @{ error = 'La contraseña no coincide.' }
      return
    }
    $csrf = New-Session -Context $Context
    Send-Json $Context 200 @{ authenticated = $true; csrfToken = $csrf }
    return
  }

  if ($path -eq '/api/admin/logout' -and $method -eq 'POST') {
    $session = Get-AdminSession -Context $Context -RequireCsrf $true
    if (-not $session) { return }
    Clear-Session -Context $Context -SessionId $session.id
    Send-Empty $Context 204
    return
  }

  if ($path -eq '/api/admin/products' -and $method -eq 'GET') {
    if (-not (Get-AdminSession -Context $Context)) { return }
    Send-Json $Context 200 (Read-ProductList) -AsArray
    return
  }

  if ($path -eq '/api/admin/financial-summary' -and $method -eq 'GET') {
    if (-not (Get-AdminSession -Context $Context)) { return }
    $sales = @(Read-Ledger -Path $script:SalesFile)
    $expenses = @(Read-Ledger -Path $script:ExpensesFile)
    $revenue = [decimal](($sales | Measure-Object -Property revenue -Sum).Sum)
    $costOfGoods = [decimal](($sales | Measure-Object -Property costOfGoods -Sum).Sum)
    $operatingExpenses = [decimal](($expenses | Measure-Object -Property amount -Sum).Sum)
    $unknownCostSales = @($sales | Where-Object { -not $_.costKnown }).Count
    $grossProfit = if ($unknownCostSales -gt 0) { $null } else { $revenue - $costOfGoods }
    $netProfitEstimate = if ($grossProfit -ne $null) { $grossProfit - $operatingExpenses } else { $null }
    Send-Json $Context 200 @{
      confirmedSales = $sales.Count
      revenue = $revenue
      costOfGoods = $costOfGoods
      grossProfit = $grossProfit
      operatingExpenses = $operatingExpenses
      netProfitEstimate = $netProfitEstimate
      profitComplete = ($unknownCostSales -eq 0)
      salesWithUnknownCost = $unknownCostSales
    }
    return
  }

  if ($path -eq '/api/admin/sales' -and $method -eq 'GET') {
    if (-not (Get-AdminSession -Context $Context)) { return }
    Send-Json $Context 200 (Read-Ledger -Path $script:SalesFile) -AsArray
    return
  }

  if ($path -eq '/api/admin/sales' -and $method -eq 'POST') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $body = Read-JsonBody -Context $Context
    $products = @(Read-ProductList)
    $productIndex = -1
    for ($index = 0; $index -lt $products.Count; $index++) {
      if ([string]$products[$index].id -eq [string]$body.productId) { $productIndex = $index; break }
    }
    if ($productIndex -lt 0) { throw 'Seleccioná un producto válido.' }
    $product = $products[$productIndex]
    $quantity = [int]$body.quantity
    if ($quantity -lt 1 -or $quantity -gt 100000) { throw 'La cantidad debe ser mayor que cero.' }
    $unitCost = [decimal]$product.unitCost
    $unitPrice = if ($body.unitPrice) { [decimal]::Parse([string]$body.unitPrice, [System.Globalization.CultureInfo]::InvariantCulture) } else { Get-CurrentSalePrice -Product $product }
    if ($unitPrice -lt 0 -or $unitPrice -gt 1000000000) { throw 'El precio de venta no es válido.' }
    $revenue = $unitPrice * $quantity
    $costKnown = $unitCost -gt 0
    $costOfGoods = if ($costKnown) { $unitCost * $quantity } else { $null }
    $grossProfit = if ($costKnown) { $revenue - $costOfGoods } else { $null }
    $sale = @{
      id = [guid]::NewGuid().ToString('N')
      productId = [string]$product.id
      productName = [string]$product.name
      quantity = $quantity
      unitPrice = $unitPrice
      unitCost = if ($costKnown) { $unitCost } else { $null }
      revenue = $revenue
      costOfGoods = $costOfGoods
      grossProfit = $grossProfit
      costKnown = $costKnown
      confirmedAt = if ($body.confirmedAt) { [string]$body.confirmedAt } else { [DateTimeOffset]::Now.ToString('o') }
      channel = ([string]$body.channel).Trim()
      note = ([string]$body.note).Trim()
    }
    $sales = @(Read-Ledger -Path $script:SalesFile) + @($sale)
    Write-Ledger -Path $script:SalesFile -Entries $sales
    Send-Json $Context 201 $sale
    return
  }

  if ($path -match '^/api/admin/(sales|expenses)/([a-fA-F0-9-]+)$' -and $method -eq 'DELETE') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $ledgerFile = if ($Matches[1] -eq 'sales') { $script:SalesFile } else { $script:ExpensesFile }
    $entryId = $Matches[2]
    $entries = @(Read-Ledger -Path $ledgerFile)
    if (-not ($entries | Where-Object { [string]$_.id -eq $entryId })) {
      Send-Json $Context 404 @{ error = 'No encontramos ese movimiento.' }
      return
    }
    Write-Ledger -Path $ledgerFile -Entries @($entries | Where-Object { [string]$_.id -ne $entryId })
    Send-Empty $Context 204
    return
  }

  if ($path -eq '/api/admin/expenses' -and $method -eq 'GET') {
    if (-not (Get-AdminSession -Context $Context)) { return }
    Send-Json $Context 200 (Read-Ledger -Path $script:ExpensesFile) -AsArray
    return
  }

  if ($path -eq '/api/admin/expenses' -and $method -eq 'POST') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $body = Read-JsonBody -Context $Context
    $description = ([string]$body.description).Trim()
    $amount = [decimal]::Parse([string]$body.amount, [System.Globalization.CultureInfo]::InvariantCulture)
    if (-not $description -or $description.Length -gt 160) { throw 'Describí el gasto en hasta 160 caracteres.' }
    if ($amount -le 0 -or $amount -gt 1000000000) { throw 'El importe del gasto debe ser mayor que cero.' }
    $expense = @{ id = [guid]::NewGuid().ToString('N'); description = $description; category = ([string]$body.category).Trim(); amount = $amount; date = if ($body.date) { [string]$body.date } else { [DateTimeOffset]::Now.ToString('o') } }
    $expenses = @(Read-Ledger -Path $script:ExpensesFile) + @($expense)
    Write-Ledger -Path $script:ExpensesFile -Entries $expenses
    Send-Json $Context 201 $expense
    return
  }

  if ($path -eq '/api/admin/orders' -and $method -eq 'GET') {
    if (-not (Get-AdminSession -Context $Context)) { return }
    Send-Json $Context 200 (Read-Ledger -Path $script:OrdersFile | Sort-Object createdAt -Descending) -AsArray
    return
  }

  if ($path -eq '/api/admin/orders' -and $method -eq 'POST') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $body = Read-JsonBody -Context $Context
    $customerName = ([string]$body.customerName).Trim()
    $phoneE164 = Normalize-ArgentinePhone -Phone ([string]$body.phoneE164).Trim()
    $quantity = [int]$body.quantity
    $status = [string]$body.status
    if (-not $customerName -or $customerName.Length -gt 100) { throw 'Ingresá el nombre del cliente.' }
    if (-not $phoneE164) { throw 'Ingresá un WhatsApp argentino válido y normalizado.' }
    if ($quantity -lt 1 -or $quantity -gt 100000) { throw 'La cantidad debe ser mayor que cero.' }
    if ($status -notin @('ordered','ready','delivered')) { throw 'El estado del pedido no es válido.' }
    $products = @(Read-ProductList)
    $productIndex = -1
    for ($index = 0; $index -lt $products.Count; $index++) {
      if ([string]$products[$index].id -eq [string]$body.productId) { $productIndex = $index; break }
    }
    if ($productIndex -lt 0) { throw 'Seleccioná un producto válido.' }
    $product = $products[$productIndex]
    $unitPrice = if ($body.unitPrice) { [decimal]::Parse([string]$body.unitPrice, [System.Globalization.CultureInfo]::InvariantCulture) } else { Get-CurrentSalePrice -Product $product }
    if ($unitPrice -lt 0 -or $unitPrice -gt 1000000000) { throw 'El precio del pedido no es válido.' }
    $order = @{
      id = [guid]::NewGuid().ToString('N')
      customerName = $customerName
      phoneE164 = $phoneE164
      productId = [string]$product.id
      productName = [string]$product.name
      quantity = $quantity
      unitPrice = $unitPrice
      status = $status
      createdAt = [DateTimeOffset]::Now.ToString('o')
      updatedAt = [DateTimeOffset]::Now.ToString('o')
      note = ([string]$body.note).Trim()
      saleId = ''
    }
    if ($status -eq 'delivered') {
      $sale = New-ConfirmedSale -Product $product -Quantity $quantity -UnitPrice $unitPrice -Channel 'Pedido del panel' -Note $order.note -OrderId $order.id
      $sales = @(Read-Ledger -Path $script:SalesFile) + @($sale)
      Write-Ledger -Path $script:SalesFile -Entries $sales
      $order.saleId = $sale.id
    }
    $orders = @(Read-Ledger -Path $script:OrdersFile) + @($order)
    Write-Ledger -Path $script:OrdersFile -Entries $orders
    Send-Json $Context 201 $order
    return
  }

  if ($path -match '^/api/admin/orders/([a-fA-F0-9-]+)$') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $orderId = $Matches[1]
    $orders = @(Read-Ledger -Path $script:OrdersFile)
    $orderIndex = -1
    for ($index = 0; $index -lt $orders.Count; $index++) {
      if ([string]$orders[$index].id -eq $orderId) { $orderIndex = $index; break }
    }
    if ($orderIndex -lt 0) { Send-Json $Context 404 @{ error = 'No encontramos ese pedido.' }; return }
    $order = $orders[$orderIndex]
    if ($method -eq 'DELETE') {
      if ($order.saleId) {
        $sales = @(Read-Ledger -Path $script:SalesFile)
        Write-Ledger -Path $script:SalesFile -Entries @($sales | Where-Object { [string]$_.id -ne [string]$order.saleId })
      }
      Write-Ledger -Path $script:OrdersFile -Entries @($orders | Where-Object { [string]$_.id -ne $orderId })
      Send-Empty $Context 204
      return
    }
    if ($method -ne 'PUT') { Send-Empty $Context 405; return }
    $body = Read-JsonBody -Context $Context
    $nextStatus = [string]$body.status
    if ($nextStatus -notin @('ordered','ready','delivered')) { throw 'El estado del pedido no es válido.' }
    $allowedNext = switch ($order.status) {
      'ordered' { @('ready','delivered') }
      'ready' { @('delivered') }
      'delivered' { @() }
      default { @() }
    }
    if ($nextStatus -eq $order.status) { Send-Json $Context 200 $order; return }
    if ($nextStatus -notin $allowedNext) { throw 'Ese cambio de estado no está permitido. Los pedidos avanzan: encargado, listo y entregado.' }
    if ($nextStatus -eq 'delivered') {
      $product = @(Read-ProductList | Where-Object { [string]$_.id -eq [string]$order.productId }) | Select-Object -First 1
      if (-not $product) {
        $product = [pscustomobject]@{ id = $order.productId; name = $order.productName; unitCost = 0 }
      }
      $sale = New-ConfirmedSale -Product $product -Quantity ([int]$order.quantity) -UnitPrice ([decimal]$order.unitPrice) -Channel 'Pedido del panel' -Note ([string]$order.note) -OrderId $order.id
      $sales = @(Read-Ledger -Path $script:SalesFile) + @($sale)
      Write-Ledger -Path $script:SalesFile -Entries $sales
      $order.saleId = $sale.id
    }
    $order.status = $nextStatus
    $order.updatedAt = [DateTimeOffset]::Now.ToString('o')
    $orders[$orderIndex] = $order
    Write-Ledger -Path $script:OrdersFile -Entries $orders
    Send-Json $Context 200 $order
    return
  }

  if ($path -eq '/api/admin/order-settings' -and $method -eq 'GET') {
    if (-not (Get-AdminSession -Context $Context)) { return }
    Send-Json $Context 200 (Read-OrderSettings)
    return
  }

  if ($path -eq '/api/admin/order-settings' -and $method -eq 'PUT') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $body = Read-JsonBody -Context $Context
    $template = ([string]$body.whatsappTemplate).Trim()
    if (-not $template -or $template.Length -gt 600) { throw 'La plantilla debe tener entre 1 y 600 caracteres.' }
    foreach ($placeholder in @('{nombre}','{cantidad}','{producto}')) {
      if (-not $template.Contains($placeholder)) { throw "La plantilla debe incluir $placeholder." }
    }
    $settings = @{ whatsappTemplate = $template }
    Write-OrderSettings -Settings $settings
    Send-Json $Context 200 $settings
    return
  }

  if ($path -eq '/api/admin/site-content' -and $method -eq 'GET') {
    if (-not (Get-AdminSession -Context $Context)) { return }
    Send-Json $Context 200 (Read-SiteContent)
    return
  }

  if ($path -eq '/api/admin/site-content' -and $method -eq 'PUT') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $body = Read-JsonBody -Context $Context
    $heroBadge = ([string]$body.heroBadge).Trim()
    $heroAccent = ([string]$body.heroAccent).Trim()
    $heroDescription = ([string]$body.heroDescription).Trim()
    if (-not $heroBadge -or $heroBadge.Length -gt 120) { throw 'La frase superior es obligatoria y admite hasta 120 caracteres.' }
    if (-not $heroAccent -or $heroAccent.Length -gt 45) { throw 'La palabra destacada es obligatoria y admite hasta 45 caracteres.' }
    if (-not $heroDescription -or $heroDescription.Length -gt 400) { throw 'La descripción es obligatoria y admite hasta 400 caracteres.' }
    $content = @{ heroBadge = $heroBadge; heroAccent = $heroAccent; heroDescription = $heroDescription }
    Write-SiteContent -Content $content
    Send-Json $Context 200 $content
    return
  }

  if ($path -eq '/api/admin/products' -and $method -eq 'POST') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf $true)) { return }
    $body = Read-JsonBody -Context $Context
    $products = @(Read-ProductList)
    $product = ConvertTo-Product -Body $body
    if ($product.sku -and @($products | Where-Object { $_.sku -eq $product.sku }).Count -gt 0) {
      Send-Json $Context 409 @{ error = 'Ya existe un producto con ese SKU.' }
      return
    }
    $products += $product
    Write-ProductList -Items $products
    Send-Json $Context 201 $product
    return
  }

  if ($path -match '^/api/admin/products/([a-zA-Z0-9_-]+)$') {
    if (-not (Get-AdminSession -Context $Context -RequireCsrf ($method -ne 'GET'))) { return }
    $productId = $Matches[1]
    $products = @(Read-ProductList)
    $productIndex = -1
    for ($index = 0; $index -lt $products.Count; $index++) {
      if ([string]$products[$index].id -eq $productId) { $productIndex = $index; break }
    }
    if ($productIndex -lt 0) {
      Send-Json $Context 404 @{ error = 'No encontramos ese producto.' }
      return
    }
    if ($method -eq 'PUT') {
      $body = Read-JsonBody -Context $Context
      $updated = ConvertTo-Product -Body $body -Existing $products[$productIndex]
      if ($updated.sku -and @($products | Where-Object { $_.sku -eq $updated.sku -and $_.id -ne $productId }).Count -gt 0) {
        Send-Json $Context 409 @{ error = 'Ya existe otro producto con ese SKU.' }
        return
      }
      $products[$productIndex] = $updated
      Write-ProductList -Items $products
      Send-Json $Context 200 $updated
      return
    }
    if ($method -eq 'DELETE') {
      $products = @($products | Where-Object { [string]$_.id -ne $productId })
      Write-ProductList -Items $products
      Send-Empty $Context 204
      return
    }
  }

  if ($path.StartsWith('/api/')) {
    Send-Json $Context 404 @{ error = 'Ruta de API inexistente.' }
    return
  }

  if ($method -in @('GET', 'HEAD')) {
    Send-StaticFile -Context $Context -UrlPath $path
    return
  }
  Send-Empty $Context 405
}

$port = 8080
if ($env:NEYRA_PORT -and [int]::TryParse($env:NEYRA_PORT, [ref]$port)) { }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
try {
  $listener.Start()
} catch {
  Write-Error "No se pudo iniciar el servidor en http://127.0.0.1:$port/. $($_.Exception.Message)"
  exit 1
}

Write-Host "Neyra Store: http://127.0.0.1:$port/tienda/"
Write-Host "Panel admin: http://127.0.0.1:$port/admin/ (configuración inicial al entrar)"
Write-Host 'Servidor local. Para producción, usar HTTPS y un host que ejecute PowerShell.'

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    try {
      Invoke-Request -Context $context
    } catch {
      Write-Warning "Error procesando $($context.Request.HttpMethod) $($context.Request.Url.AbsolutePath): $($_.Exception.Message)"
      if (-not $context.Response.OutputStream.CanWrite) { continue }
      try { Send-Json $context 400 @{ error = $_.Exception.Message } } catch { }
    }
  } catch [System.Net.HttpListenerException] {
    if ($listener.IsListening) { Write-Warning $_.Exception.Message }
  }
}