import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Locale = 'zh' | 'en'

const EN: Record<string, string> = {
  '主页': 'Home',
  '数据': 'Data',
  '记录': 'Records',
  '我的': 'Profile',
  '在线': 'Online',
  '离线': 'Offline',
  '深色': 'Dark',
  '浅色': 'Light',
  '全屏': 'Fullscreen',
  '显示导航': 'Show navigation',
  '我的主页': 'Profile',
  '设备、服务与系统设置': 'Devices, services and settings',
  '设备操作员': 'Device operator',
  '本地账户 · 云端账户待接入': 'Local · Cloud pending',
  '设备': 'Devices',
  '设备管理': 'Device management',
  '设备离线': 'Device offline',
  '手套与蓝牙': 'Gloves & Bluetooth',
  '设置': 'Settings',
  '关于': 'About',
  '论坛': 'Forum',
  '服务与支持': 'Service & support',
  '待接入': 'Pending',
  '退出登录': 'Sign out',
  '退出': 'Sign out',
  '账户系统待接入': 'Account service pending',
  '账户详情': 'Account details',
  '管理设备': 'Manage devices',
  '已绑定设备': 'Bound devices',
  '大包下载': 'Package download',
  '本机设备': 'Local device',
  '添加更多设备': 'Add another device',
  '支持扫码绑定和设备类型选择。': 'Bind by QR code or device type.',
  '添加设备': 'Add device',
  '选择设备类型': 'Choose device type',
  '选择需要绑定的设备': 'Choose a device to bind',
  '手部动作捕捉套件': 'Hand motion capture kit',
  '多传感器采集套件': 'Multi-sensor capture kit',
  '扫描二维码': 'Scan QR code',
  '摄像头扫码接口待接入': 'QR camera API pending',
  '将设备二维码放入框内': 'Place the device QR code in the frame',
  '当前后端尚未提供二维码识别接口。': 'The QR recognition API is not available yet.',
  '手动确认设备': 'Confirm manually',
  '确认设备信息': 'Confirm device information',
  '当前选中': 'Selected',
  '通信方式': 'Connection',
  '本机网络': 'Local network',
  '绑定状态': 'Binding status',
  '接口待接入': 'API pending',
  '查看本机设备': 'View local device',
  '设备信息': 'Device information',
  '部分传感器在线': 'Some sensors online',
  '等待传感器': 'Waiting for sensors',
  '运行状态': 'Status',
  '电量': 'Battery',
  '电压': 'Voltage',
  '存储': 'Storage',
  '网络': 'Network',
  '相机': 'Camera',
  '未连接': 'Not connected',
  '通道待接入': 'Channel pending',
  'WiFi 设置': 'WiFi settings',
  '当前未连接': 'Not connected',
  '未连接网络': 'No network',
  '请扫描并选择网络': 'Scan and choose a network',
  '断开': 'Disconnect',
  '可用网络': 'Available networks',
  '扫描中…': 'Scanning…',
  '开放网络': 'Open network',
  '正在扫描': 'Scanning',
  '尚未扫描网络': 'No scan yet',
  '开始扫描': 'Start scan',
  '连接网络': 'Connect network',
  'WiFi 密码': 'WiFi password',
  '请输入密码': 'Enter password',
  '取消': 'Cancel',
  '连接': 'Connect',
  '手套': 'Gloves',
  '扫描': 'Scan',
  '校准': 'Calibration',
  '左手手套': 'Left glove',
  '右手手套': 'Right glove',
  '有线在线': 'Wired',
  '附近设备': 'Nearby devices',
  '未知设备': 'Unknown device',
  '已配对': 'Paired',
  '已连接': 'Connected',
  '尚未扫描': 'No scan yet',
  '正在扫描附近设备': 'Scanning nearby devices',
  '重新连接': 'Reconnect',
  '手套校准服务': 'Glove calibration service',
  '服务运行中': 'Service running',
  '服务未启动': 'Service stopped',
  '停止': 'Stop',
  '启动': 'Start',
  '重启': 'Restart',
  '打开': 'Open',
  '左手校准': 'Calibrate left',
  '右手校准': 'Calibrate right',
  '请先连接手套': 'Connect a glove first',
  '开始校准': 'Start calibration',
  '正在交接…': 'Preparing…',
  '本机采集设置': 'Local capture settings',
  '录制后自动处理': 'Auto process after recording',
  '停止录制后自动解码 IMU 数据': 'Decode IMU data after recording stops',
  '界面语言': 'Language',
  '当前：简体中文': 'Current: English',
  '存储位置': 'Storage location',
  '预留': 'Placeholder',
  '简体中文': 'Chinese',
  '英文': 'English',
  '返回': 'Back',
  '更多': 'More',
  '查看全部': 'View all',
  '开始录制': 'Start recording',
  '停止录制': 'Stop recording',
  '开始实时预览': 'Start live preview',
  '停止预览': 'Stop preview',
  '实时预览': 'Live preview',
  '录制中': 'Recording',
  '准备就绪': 'Ready',
  '暂无录制': 'No recordings',
  '录像回放': 'Video playback',
  '删除': 'Delete',
  '导出': 'Export',
  '解码': 'Decode',
  '任务': 'Task',
  '采集': 'Capture',
  '设备在线': 'Device online',
  '实时数据': 'Live data',
  '设备与传感器运行状态': 'Device and sensor status',
  '双手已连接': 'Both gloves connected',
  '单手已连接': 'One glove connected',
  '等待手套': 'Waiting for gloves',
  '左手': 'Left',
  '右手': 'Right',
  '数据通道': 'Data channels',
  '麦克风': 'Microphone',
  '相机已连接': 'Camera connected',
  '未检测到相机': 'Camera not detected',
  '夹爪角度': 'Gripper angle',
  '领取任务': 'Claim task',
  '选择采集任务': 'Choose a capture task',
  '开始采集': 'Start capture',
  '预览并录制': 'Preview and record',
  '相机 · 左手 · 右手 · 存储': 'Camera · Left · Right · Storage',
  '左右手状态': 'Left and right glove status',
  '切换到深色模式': 'Switch to dark mode',
  '切换到浅色模式': 'Switch to light mode',
  '隐藏顶部和底部导航': 'Hide navigation',
  '恢复导航': 'Restore navigation',
  '主导航': 'Main navigation',
  '设备实时画面': 'Live device video',
  '等待相机接入': 'Waiting for camera',
  '独立视频通道待接入': 'Independent video channel pending',
  '数据接口待接入': 'Data API pending',
  '左夹爪': 'Left gripper',
  '右夹爪': 'Right gripper',
  '等待角度数据': 'Waiting for angle data',
  '任务领取': 'Claim task',
  '选择本次采集任务': 'Choose this capture task',
  '设备类型': 'Device type',
  '场景类型': 'Scene type',
  '任务范围': 'Task scope',
  '项目名称': 'Project',
  '子任务': 'Subtask',
  '未选择': 'Not selected',
  '请选择子任务': 'Choose a subtask',
  '场景': 'Scene',
  '计划次数': 'Planned count',
  '确认领取': 'Confirm',
  '任务领取接口待接入': 'Task API pending',
  '设备就绪': 'Device ready',
  '相机未连接': 'Camera not connected',
  '预览未启动': 'Preview not started',
  '无信号': 'No signal',
  '录制时间': 'Recording time',
  '项目': 'Project',
  '已采集': 'Captured',
  '状态': 'Status',
  '预览中': 'Previewing',
  '待开始': 'Pending',
  '最近记录': 'Recent records',
  '暂无本地记录': 'No local records',
  '设备处理中…': 'Processing…',
  '信息上报': 'Submit data',
  '触屏键盘': 'Touch keyboard',
  '大小写': 'Shift',
  '退格': 'Backspace',
  '空格': 'Space',
  '完成': 'Done',
  '关闭': 'Close',
  '系统': 'System',
  '连接状态': 'status',
  '功能': 'features',
  '扫描网络': 'Scan networks',
  '切换为简体中文': 'Switch to Chinese',
  '智能穿戴数据采集终端': 'Wearable data capture terminal',
  '准备开始采集': 'Ready to capture',
  '在同一个界面检查设备、领取任务并开始录制。': 'Check devices, claim a task and start recording from one screen.',
  '进入实时数据': 'Open live data',
  '设备与套件': 'Devices & kits',
  '手部动作捕捉': 'Hand motion capture',
  '多传感器采集': 'Multi-sensor capture',
  '状态检查': 'Status check',
  '设备数据完整性': 'Device data integrity',
  '精选内容': 'Featured',
  '查看采集指南': 'View capture guides',
  '数据上报': 'Data upload',
  '云端接口预留': 'Cloud API pending',
  '采集记录': 'Capture records',
  '条本地记录': ' local records',
  '记录数量': 'Record count',
  '数据总量': 'Total data',
  '外接存储': 'External storage',
  '暂无采集记录': 'No capture records',
  '完成一次录制后，记录会显示在这里。': 'Recordings will appear here after the first capture.',
  '设备软件与离线资源': 'Device software and offline resources',
  '设备软件包': 'Device package',
  '当前版本信息需要升级服务接口支持。': 'Version details require the update service API.',
  '版本待检测': 'Version check pending',
  '检查可用更新': 'Check for updates',
  '下载、校验和安装流程均已预留界面位置。': 'Download, verification and installation are reserved.',
  '检查更新': 'Check for updates',
  '独立右路待接入': 'Independent right channel pending',
  '条': '',
  '设备商城': 'Device marketplace',
  '设备与采集套件': 'Devices and capture kits',
  '轻量化手部动作捕捉套件': 'Lightweight hand motion capture kit',
  '手部追踪': 'Hand tracking',
  '无线连接': 'Wireless connection',
  '任务采集': 'Task capture',
  '相机、手套与多传感器一体化采集套件': 'Camera, gloves and multi-sensor capture kit',
  '双目相机': 'Stereo camera',
  '多传感器': 'Multi-sensor',
  '本地记录': 'Local records',
  '展示位': 'Preview',
  '商城下单、价格和库存接口待接入': 'Ordering, pricing and inventory APIs pending',
  '采集指南与推荐任务': 'Capture guides and recommended tasks',
  '第一次使用 SensorHub': 'Getting started with SensorHub',
  '了解设备检查、任务领取、相机预览和数据录制的完整流程。': 'Learn the complete device check, task, preview and recording workflow.',
  '播放内容': 'Play',
  '采集前检查': 'Pre-capture check',
  '确认相机、手套、存储和电量': 'Confirm camera, gloves, storage and battery',
  '高质量动作数据': 'High-quality motion data',
  '保持目标物体处于相机视野内': 'Keep the target inside the camera view',
  '数据整理与上报': 'Process and upload data',
  '完成解码、传输和云端同步': 'Complete decoding, transfer and cloud sync',
  '账户': 'Account',
  '本地操作员与云端账户': 'Local operator and cloud account',
  '当前以本地离线身份使用设备。': 'Using this device with a local offline identity.',
  '本地可用': 'Available locally',
  '云端账户': 'Cloud account',
  '登录后可同步任务、上传记录和访问服务支持。': 'Sign in to sync tasks, upload records and access support.',
  '登录云端账户': 'Sign in',
  '注册账户': 'Create account',
  '记录详情': 'Record details',
  '关闭详情': 'Close details',
  '预览生成失败': 'Preview failed',
  '该记录没有彩色视频': 'No color video in this record',
  '深度、手套和 IMU 数据仍可正常管理': 'Depth, glove and IMU data remain available',
  '彩色': 'Color',
  '深度': 'Depth',
  '双目': 'Stereo',
  '音频': 'Audio',
  '传输': 'Transfer',
  '删除中': 'Deleting',
  '家庭收纳': 'Home organization',
  '办公场景': 'Office',
  '工业装配': 'Industrial assembly',
  '最近任务': 'Recent tasks',
  '全部任务': 'All tasks',
  '我的任务': 'My tasks',
  '任务详情和 SOP 将在任务平台 API 接入后显示。': 'Task details and SOP will appear when the task API is connected.',
  '选择项目': 'Choose an option',
  '关闭选择器': 'Close options',
  '显示密码': 'Show password',
  '隐藏密码': 'Hide password',
  '已传输': 'Transferred',
  '本地': 'Local',
  '信号': 'Signal',
  '1 台在线': '1 device online',
  '解码已开始': 'Decode started',
  '传输已开始': 'Transfer started',
  '设置已保存': 'Settings saved',
  '录制已开始': 'Recording started',
  '录制已停止': 'Recording stopped',
  '实时预览已启动': 'Live preview started',
  '实时预览已停止': 'Live preview stopped',
}

const originalText = new WeakMap<Text, string>()
const originalAttributes = new WeakMap<Element, Record<string, string>>()

function translateText(value: string, locale: Locale) {
  if (locale === 'zh') return value
  return EN[value] ?? value
}

function localizeDom(root: Node, locale: Locale) {
  if (root.nodeType === Node.TEXT_NODE) {
    const textNode = root as Text
    const current = textNode.data
    if (locale === 'en' && /[\u3400-\u9fff]/.test(current)) {
      originalText.set(textNode, current)
    }
    const source = originalText.get(textNode) || current
    const next = locale === 'zh' ? source : translateText(source, locale)
    if (next !== current) textNode.data = next
    return
  }

  if (root instanceof Element) {
    if (root.classList.contains('language-button')) return
    const saved = originalAttributes.get(root) || {}
    for (const name of ['aria-label', 'placeholder', 'title']) {
      const current = root.getAttribute(name)
      if (!current) continue
      if (locale === 'en' && /[\u3400-\u9fff]/.test(current)) saved[name] = current
      const source = saved[name] || current
      const next = locale === 'zh' ? source : translateText(source, locale)
      if (next !== current) root.setAttribute(name, next)
    }
    originalAttributes.set(root, saved)
  }

  root.childNodes.forEach((child) => { localizeDom(child, locale) })
}

type I18nValue = {
  locale: Locale
  toggleLocale: () => void
  t: (value: string) => string
  localizeNode: (node: ReactNode) => ReactNode
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() =>
    window.localStorage.getItem('sensorhub-locale') === 'en' ? 'en' : 'zh',
  )

  useEffect(() => {
    const apply = () => localizeDom(document.body, locale)
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-label', 'placeholder', 'title'],
      characterData: true,
      childList: true,
      subtree: true,
    })
    return () => observer.disconnect()
  }, [locale])

  const value = useMemo<I18nValue>(() => {
    const t = (text: string) => translateText(text, locale)
    const localizeNode = (node: ReactNode): ReactNode => {
      if (typeof node === 'string') return t(node)
      if (Array.isArray(node)) return node.map(localizeNode)
      if (!isValidElement(node)) return node

      const props = node.props as Record<string, unknown>
      const translatedProps: Record<string, unknown> = {}
      for (const key of ['aria-label', 'placeholder', 'title']) {
        if (typeof props[key] === 'string') translatedProps[key] = t(props[key])
      }
      if ('children' in props) {
        translatedProps.children = Children.map(
          props.children as ReactNode,
          localizeNode,
        )
      }
      return cloneElement(node, translatedProps)
    }
    return {
      locale,
      t,
      localizeNode,
      toggleLocale: () =>
        setLocale((current) => {
          const next = current === 'zh' ? 'en' : 'zh'
          window.localStorage.setItem('sensorhub-locale', next)
          return next
        }),
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
