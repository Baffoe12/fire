#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPS++.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Add after other includes
#define XSTR(x) STR(x)    // Convert macro value to string
#define STR(x) #x         // Convert token to string

// LCD setup
#define I2C_SDA 21
#define I2C_SCL 22
#define LCD_ADDRESS 0x27  // Usually 0x27 or 0x3F
#define LCD_COLS 16
#define LCD_ROWS 2

// WiFi setup
#define WIFI_SSID "Run wale"     // Change this to your WiFi SSID
#define WIFI_PASSWORD "1234567890"  // Change this to your WiFi password

// GPS setup
#define GPS_TX_PIN 26
#define GPS_RX_PIN 5

// GSM setup
#define GSM_TX_PIN 27
#define GSM_RX_PIN 19
#define EMERGENCY_PHONE_NUMBER "+233557043125" // <-- Change this to your desired phone number

// Heart pulse sensor setup
#define PULSE_PIN 33
#define WIFI_LED_PIN 2  // Add LED pin definition

// Hall sensor setup
#define HALL_PIN 35
#define SEAT_BELT_TIMEOUT 10000  // 10 seconds timeout
#define SEAT_BELT_THRESHOLD 2000  // Adjust based on your hall sensor

// Add after other pin definitions
#define MQ3_PIN 32
#define ALCOHOL_LED_PIN 0
#define ALCOHOL_THRESHOLD 500    // Reduced from 1000 to 500 for better sensitivity
#define ALCOHOL_SAMPLES 10        // More samples for better averaging
#define ALCOHOL_READ_DELAY 100    // Delay between readings

// Add these definitions after other #defines
#define MESSAGE_INTERVAL 10800000  // 3 hours in milliseconds

// Update backend settings
#define BACKEND_URL "http://172.20.10.2:4000/api/sensor"  // Direct URL construction
#define BACKEND_RETRY_COUNT 3

// Add backend settings after other #defines
#define BACKEND_UPDATE_INTERVAL 5000  // Send data every 5 seconds
#define API_KEY "safedrive_secret_key"       // Add your backend API key

// Add these global variables after the existing global variables
TinyGPSPlus gps;
unsigned long timestamp;
float lat = 0;
float lng = 0;
int alcoholReadings[ALCOHOL_SAMPLES] = {0};  // Array to store alcohol readings
int alcoholIndex = 0;                        // Current index in alcohol readings array
bool initialSamplesCollected = false;        // Flag for initial samples
unsigned long lastMessageTime = 0;           // Last time a message was sent
unsigned long lastBackendUpdate = 0;
HTTPClient http;
StaticJsonDocument<512> jsonDoc;

// Add after other global variables
#define VIBRATION_PIN 34
#define ACCIDENT_THRESHOLD 3000  // Adjust based on your sensor
#define ACCIDENT_COOLDOWN 60000  // 1 minute cooldown between accident alerts
unsigned long lastAccidentTime = 0;
bool accidentDetected = false;

// Update ultrasonic sensor settings
#define ULTRASONIC_TRIG 13
#define ULTRASONIC_ECHO 14
#define DISTANCE_LED_PIN 4
#define SAFE_DISTANCE 200      // Increased safe distance to 2 meters
#define WARNING_DISTANCE 150   // Early warning at 1.5 meters
#define CRITICAL_DISTANCE 100  // Critical warning at 1 meter
#define EMERGENCY_DISTANCE 50  // Emergency stop at 50cm
#define ULTRASONIC_TIMEOUT 15000   // Reduced timeout for faster error detection
#define ULTRASONIC_MIN_DIST 5      // Minimum reliable distance (cm)
#define ULTRASONIC_MAX_DIST 200    // Maximum reliable range for consistent readings
#define ULTRASONIC_INTERVAL 2      // Reduce to 2ms between readings
#define ULTRASONIC_READ_INTERVAL 10 // Reduce to 10ms
#define MAX_INVALID_READINGS 5      // More readings before confirming object removed
#define READING_SAMPLES 5           // Number of samples to average
#define ERROR_MARGIN 10            // 10cm error margin for distance readings
#define MOTOR_RESPONSE_DELAY 50    // Quick motor response time

// Add validation counters
#define READING_HISTORY_SIZE 5     // Keep track of last 5 readings
long previousReadings[READING_HISTORY_SIZE] = {0};  // Array to store previous readings
int readingIndex = 0;              // Current index in readings array

// Add these definitions after other #defines
#define SENSOR_UPDATE_INTERVAL 100   // Update sensors every 100ms
#define DISPLAY_UPDATE_INTERVAL 1000 // Update display every 1 second

// Add MPU threshold definitions after other #define statements
#define MPU_THRESHOLD_X 2.0  // Acceleration threshold in g
#define MPU_THRESHOLD_Y 2.0  // Acceleration threshold in g
#define MPU_THRESHOLD_Z 2.0  // Acceleration threshold in g

// Add after other #defines
#define BPM_THRESHOLD 1800     // Adjust for human pulse detection
#define BPM_SAMPLE_TIME 15     // 15 seconds measurement window
#define BPM_UPDATE_INTERVAL 20 // 20ms between samples
#define PULSE_THRESHOLD 1000     // Lower threshold for human pulse
#define PULSE_MAX_VALUE 2000     // Maximum expected value
#define PULSE_MIN_VALUE 500      // Minimum expected value
#define PULSE_SAMPLE_DELAY 20    // Sample every 20ms
#define MIN_BPM 50              // Minimum human BPM
#define MAX_BPM 180             // Maximum human BPM

// Add new threshold definitions
#define RAPID_DECEL_THRESHOLD 3.0    // Sudden deceleration threshold in g
#define TILT_ANGLE_THRESHOLD 45.0    // Vehicle tilt threshold in degrees
#define BRAKE_DISTANCE 20           // Emergency brake distance in cm
#define SPEED_CHECK_INTERVAL 100    // Speed check interval in ms

// Add these definitions after other #defines
#define IMPACT_THRESHOLD_LOW 3.0   // Light impact (g)
#define IMPACT_THRESHOLD_HIGH 6.0  // Severe impact (g)
#define TILT_THRESHOLD_ROLL 45.0  // Roll threshold (degrees)
#define TILT_THRESHOLD_PITCH 30.0 // Pitch threshold (degrees)
#define PRE_COLLISION_TIME 500    // Pre-collision warning time (ms)

// Add system recovery settings
#define SYSTEM_WATCHDOG_TIMEOUT 30000  // Reset system if frozen for 30 seconds
#define SENSOR_ERROR_THRESHOLD 3       // Number of consecutive errors before recovery
#define RECOVERY_DELAY 1000            // Time between recovery attempts

// Add these variables after other globals
unsigned long lastSensorUpdate = 0;
unsigned long lastDisplayUpdate = 0;

// Add before VehicleState struct
bool check_seat_belt() {
  int hallValue = analogRead(HALL_PIN);
  return hallValue < SEAT_BELT_THRESHOLD;
}

struct VehicleState {
  float roll;
  float pitch;
  float impact;
  long distance;
  int vibration;
  bool seatbelt;
  int alcoholLevel;
  float speed;
  int pulse;  // Add pulse field
} vehicleState;

// Add after the VehicleState struct definition
void init_vehicle_state() {
  vehicleState.alcoholLevel = 0;
  vehicleState.impact = 0;
  vehicleState.distance = 100;  // Default safe distance
  vehicleState.vibration = 0;
  vehicleState.pulse = 0;
  vehicleState.seatbelt = check_seat_belt();
}

// Add after other global variables
bool initialDataSent = false;

// Add after other global variables
bool accidentAlertSent = false;

// Add new global variables
float lastSpeed = 0;
unsigned long lastSpeedCheck = 0;
bool warningIssued = false;
int dangerLevel = 0;  // 0=safe, 1=warning, 2=critical, 3=emergency

// Add after other pin definitions
#define MOTOR_IN1 16
#define MOTOR_IN2 15
#define MOTOR_IN3 23
#define MOTOR_IN4 17

// Add after other #defines
#define MOTOR_SLOW_DISTANCE 50    // Distance at which to start slowing (cm)
#define MOTOR_STOP_DISTANCE 20    // Distance at which to stop completely (cm)
#define MOTOR_PWM_CHANNEL_1 0    // First motor PWM channel
#define MOTOR_PWM_CHANNEL_2 1    // Second motor PWM channel
#define MOTOR_PWM_FREQ 5000       // PWM frequency
#define MOTOR_PWM_RESOLUTION 8    // 8-bit resolution (0-255)

// Add with other global variables
unsigned long lastUltrasonicCheck = 0;
unsigned long ledTurnOffTime = 0;

// Add after other #defines
#define ACCIDENT_LEVEL_1 1    // Ultrasonic + Vibration
#define ACCIDENT_LEVEL_2 2    // All sensors triggered
#define PHONE_NUMBER_2 "+233557043125"  // Family member's number

// Add after other global variables
int currentAccidentLevel = 0;
bool callSent = false;

// Add after other global variables
unsigned long lastMotorStatusUpdate = 0;
unsigned long motorMessageDuration = 1000;  // Show motor status for 1 second
bool motorStatusDisplayed = false;

// Add after other global variables
unsigned long lastUltrasonicRead = 0;
unsigned long lastSensorRead = 0;

// Add after other global variables
unsigned long lastValidReading = 0;
int consecutiveMaxReadings = 0;

// Add after global variables
volatile unsigned long pulseStart = 0;
volatile long currentDistance = 0;
volatile bool newDistanceAvailable = false;
TaskHandle_t ultrasonicTaskHandle = NULL;

// Add LCD display states
#define LCD_STATE_NORMAL 0     // Show sensor values
#define LCD_STATE_WARNING 1    // Show warnings/alerts
#define LCD_STATE_ENGINE 2     // Show engine status

// Add after other global variables
int currentLcdState = LCD_STATE_NORMAL;
unsigned long lcdStateTimeout = 0;
#define LCD_WARNING_DURATION 3000  // Show warnings for 3 seconds
#define LCD_ENGINE_DURATION 2000   // Show engine status for 2 seconds

// Add after other global variables
String currentLcdText = "";

// Add after other global definitions
#define PULSE_HISTORY_SIZE 10
int pulseHistory[PULSE_HISTORY_SIZE] = {0};
int pulseHistoryIndex = 0;

// Add after other global definitions
#define HISTORY_SIZE 20  // Store last 20 readings for each sensor
struct SensorHistory {
    long distance[HISTORY_SIZE];
    int alcohol[HISTORY_SIZE];
    float impact[HISTORY_SIZE];
    int pulse[HISTORY_SIZE];
    int vibration[HISTORY_SIZE];
    int index;
} sensorHistory = {{0}, {0}, {0}, {0}, {0}, 0};

// Add after other global variables
unsigned int connectionFailCount = 0;

// Add after other global variables
unsigned long startTime = 0;  // Track system uptime

// Add after other global variables
#define PULSE_DATA_POINTS 60  // Store 1 minute of data
struct PulseData {
    unsigned long timestamp;
    int value;
} pulseDataHistory[PULSE_DATA_POINTS];
int pulseDataIndex = 0;

HardwareSerial GSM(2); // Use UART2 for GSM
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);
Adafruit_MPU6050 mpu;
sensors_event_t a, g, temp;

// Function declarations
void update_lcd_status(const String &line1, const String &line2);
int measure_bpm(int pin, int measurement_time_sec = BPM_SAMPLE_TIME);
int check_alcohol();
int get_average_alcohol();
bool check_accident();
void send_accident_alert();
long measure_distance();
void get_gps_data();
void start_motor();
void stop_motor();
void set_motor_speed(int speed);
bool detect_dangerous_conditions();
void make_emergency_call();
void ultrasonicTask(void *pvParameters);
void IRAM_ATTR echoISR();
void send_to_backend();
void suspendUltrasonicTask();
bool send_sms_with_retry(const String &message, int maxRetries = 3);
bool wait_for_gsm_response(const char* expected, unsigned long timeout);
void wait_for_seat_belt();
bool init_mpu();
void init_gps();

void update_lcd_status(const String &line1, const String &line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
  currentLcdText = line1 + " | " + line2;  // Use separator for clearer display
  Serial.println("[LCD] " + currentLcdText);  // Debug output
}

void init_lcd() {
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  
  // Show welcome message
  update_lcd_status("Accident Detection", "& Prevention");
  delay(3000);
  
  // Show initialization message
  update_lcd_status("System Init...", "Checking Sensors");
  delay(2000);
}

void wait_for_seat_belt() {
  bool seatBeltOn = check_seat_belt();
  if (!seatBeltOn) {
    update_lcd_status("Optional:", "Wear Seat Belt!");
    delay(3000);  // Show warning for 3 seconds
  }
  update_lcd_status("System", "Starting...");
  delay(1000);
}

bool init_mpu() {
  if (!mpu.begin()) {
    Serial.println("MPU6050 not detected");
    return false;
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  return true;
}

void print_gsm_response() {
  String response = "";
  unsigned long start = millis();
  
  while (millis() - start < 2000) {
    while (GSM.available()) {
      char c = GSM.read();
      Serial.write(c);
      response += c;
    }
  }
  
  response.trim();
  Serial.println();
  
  if (response.length() == 0) {
    Serial.println("[GSM] No response from GSM module!");
  } else if (response.indexOf("OK") != -1) {
    Serial.println("[GSM] Response: OK");
  } else if (response.indexOf("ERROR") != -1) {
    Serial.println("[GSM] Response: ERROR");
  } else {
    Serial.print("[GSM] Raw response: ");
    Serial.println(response);
  }
  Serial.println("-------------------------------");
}

bool send_sms_with_retry(const String &message, int maxRetries) {
  for (int i = 0; i < maxRetries; i++) {
    GSM.println("AT+CMGF=1");
    delay(100);
    GSM.print("AT+CMGS=\"");
    GSM.print(EMERGENCY_PHONE_NUMBER);
    GSM.println("\"");
    delay(100);
    
    if (GSM.find(">")) {  // Wait for prompt
      GSM.print(message);
      GSM.write(26);  // CTRL+Z
      delay(1000);
      
      if (GSM.find("OK")) {
        Serial.println("[GSM] SMS sent successfully");
        return true;
      }
    }
    
    Serial.println("[GSM] Retry " + String(i + 1) + " failed, waiting...");
    delay(2000);
  }
  
  return false;
}

void send_sms(const String &message) {
  Serial.println("[GSM] Setting SMS mode...");
  GSM.println("AT+CMGF=1"); // Set SMS to text mode
  delay(500);
  print_gsm_response();

  Serial.print("[GSM] Sending SMS to: ");
  Serial.println(EMERGENCY_PHONE_NUMBER);
  GSM.print("AT+CMGS=\"");
  GSM.print(EMERGENCY_PHONE_NUMBER);
  GSM.println("\"");
  delay(500);
  print_gsm_response();

  GSM.print(message);
  delay(500);
  GSM.write(26); // CTRL+Z to send SMS
  Serial.println("[GSM] SMS sent, waiting for confirmation...");
  print_gsm_response();
  delay(2000);
}

void wait_for_network() {
  const int GSM_INIT_RETRIES = 3;
  const int NETWORK_CHECK_RETRIES = 4;  // Reduced to 4 attempts
  bool initialized = false;
  
  Serial.println("[GSM] Initializing GSM module...");
  
  // Reset GSM module
  GSM.println("AT+CFUN=0");
  delay(1000);
  GSM.println("AT+CFUN=1");
  delay(2000);
  
  // Initialize with retries
  for (int i = 0; i < GSM_INIT_RETRIES && !initialized; i++) {
    GSM.println("AT");
    delay(1000);
    if (GSM.find("OK")) {
      initialized = true;
      break;
    }
    delay(1000);  // Reduced delay
  }
  
  if (!initialized) {
    Serial.println("[GSM] Failed to initialize module");
    update_lcd_status("GSM Error", "Init Failed");
    return;
  }
  
  Serial.println("[GSM] Checking SIM card...");
  GSM.println("AT+CPIN?");
  delay(1000);
  
  bool networkFound = false;
  for (int i = 0; i < NETWORK_CHECK_RETRIES && !networkFound; i++) {
    GSM.println("AT+CREG?");
    delay(1500);  // Reduced wait time
    
    if (GSM.find("+CREG: 0,1") || GSM.find("+CREG: 0,5")) {
      networkFound = true;
      Serial.println("[GSM] Network registered!");
      break;
    }
    
    Serial.println("[GSM] Searching for network... Attempt " + String(i + 1));
    if (i == NETWORK_CHECK_RETRIES - 1) {
      Serial.println("[GSM] Moving on after " + String(NETWORK_CHECK_RETRIES) + " attempts");
    }
    delay(1000);
  }
  
  // Continue even if network not found
  GSM.println("AT+CMGF=1");
  delay(1000);
  update_lcd_status("GSM Status", networkFound ? "Network OK" : "Limited");
  delay(2000);
}

void connect_wifi() {
  update_lcd_status("WiFi Connecting", "Please wait...");
  Serial.println("[WiFi] Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  digitalWrite(WIFI_LED_PIN, LOW);  // LED off while attempting to connect
  
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] Connected successfully");
    Serial.print("[WiFi] IP address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(WIFI_LED_PIN, HIGH);  // Solid LED when connected
    update_lcd_status("WiFi Connected", WiFi.localIP().toString());
  } else {
    Serial.println("[WiFi] Connection failed!");
    digitalWrite(WIFI_LED_PIN, LOW);  // LED off if connection fails
  }
}

void init_gps() {
    // GPS Serial port with proper settings
    Serial1.begin(9600, SERIAL_8N1, GPS_TX_PIN, GPS_RX_PIN);
    pinMode(GPS_RX_PIN, INPUT_PULLUP);
    pinMode(GPS_TX_PIN, OUTPUT);

    // Wait up to 30 seconds for GPS to get a fix
    unsigned long startWait = millis();
    update_lcd_status("GPS Starting", "Waiting for fix...");
    
    while (millis() - startWait < 30000) {
        while (Serial1.available()) {
            if (gps.encode(Serial1.read())) {
                if (gps.location.isValid()) {
                    lat = gps.location.lat();
                    lng = gps.location.lng();
                    Serial.printf("[GPS] Valid position: %.6f, %.6f | Satellites: %d\n", 
                        lat, lng, gps.satellites.value());
                    return;
                } else {
                    Serial.printf("[GPS] No valid position | Satellites: %d\n", 
                        gps.satellites.value());
                }
            }
        }
        delay(10);
    }
    Serial.printf("[GPS] Warning: No initial fix after 30s | Satellites: %d\n", 
        gps.satellites.value());
}

void setup() {
  Serial.begin(115200);
  startTime = millis(); // Track system uptime
  init_lcd();
  
  // Initialize pins with status updates
  update_lcd_status("Init Hardware", "Setting up pins");
  pinMode(WIFI_LED_PIN, OUTPUT);
  pinMode(HALL_PIN, INPUT);
  pinMode(MQ3_PIN, INPUT);
  pinMode(ALCOHOL_LED_PIN, OUTPUT);
  pinMode(VIBRATION_PIN, INPUT);
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);
  pinMode(DISTANCE_LED_PIN, OUTPUT);
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  pinMode(MOTOR_IN3, OUTPUT);
  pinMode(MOTOR_IN4, OUTPUT);
  digitalWrite(WIFI_LED_PIN, LOW);
  digitalWrite(ALCOHOL_LED_PIN, LOW);
  digitalWrite(DISTANCE_LED_PIN, LOW);
  digitalWrite(ULTRASONIC_TRIG, LOW);  // Ensure trigger starts LOW
  digitalWrite(DISTANCE_LED_PIN, LOW);  // Ensure LED starts OFF
  delay(1000);
  
  // Optional seat belt check just before system starts
  wait_for_seat_belt();
  
  // GSM initialization block - must come first
  Serial.println("[GSM] Initializing GSM module...");
  GSM.begin(9600, SERIAL_8N1, GSM_TX_PIN, GSM_RX_PIN);
  delay(1000);
  
  // Check GSM module
  GSM.println("AT");
  delay(500);
  print_gsm_response();
  GSM.println("AT+CSQ");
  delay(500);
  print_gsm_response();

  // Initialize GSM network
  wait_for_network();

  // Configure SMS mode
  GSM.println("AT+CMGF=1");
  delay(500);
  print_gsm_response();

  // Only after GSM is ready, start the motor
  update_lcd_status("Starting Motor", "Please wait...");
  start_motor();
  delay(100);  // Give motor time to start

  // Continue with remaining setup
  connect_wifi();

  // GPS Serial port - update baud rate and enable internal pullups
  init_gps();

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!init_mpu()) {
    update_lcd_status("MPU6050 Error", "Check Connection");
    delay(2000);
  }

  // Setup PWM for both motors
  ledcSetup(MOTOR_PWM_CHANNEL_1, MOTOR_PWM_FREQ, MOTOR_PWM_RESOLUTION);
  ledcSetup(MOTOR_PWM_CHANNEL_2, MOTOR_PWM_FREQ, MOTOR_PWM_RESOLUTION);
  ledcAttachPin(MOTOR_IN1, MOTOR_PWM_CHANNEL_1);
  ledcAttachPin(MOTOR_IN3, MOTOR_PWM_CHANNEL_2);

  // Setup ultrasonic interrupt
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);
  attachInterrupt(digitalPinToInterrupt(ULTRASONIC_ECHO), echoISR, CHANGE);

  // Pulse sensor pin setup
  pinMode(PULSE_PIN, INPUT);

  // Create ultrasonic task with error checking
  BaseType_t taskCreated = xTaskCreatePinnedToCore(
    ultrasonicTask,
    "Ultrasonic",
    4096,
    NULL,
    3,
    &ultrasonicTaskHandle,
    1
  );

  if (taskCreated != pdPASS || ultrasonicTaskHandle == NULL) {
    Serial.println("Failed to create ultrasonic task!");
    // Handle error - maybe retry or reset
    ESP.restart();
  }

  if (WiFi.status() == WL_CONNECTED) {
    http.setReuse(true);  // Enable connection reuse
    Serial.println("[Backend] HTTP client initialized");
  }

  init_vehicle_state();  // Initialize vehicle state
}

void measure_distance_and_control_motors() {
  static unsigned long lastCheck = 0;
  unsigned long now = millis();
  
  if (now - lastCheck >= MOTOR_RESPONSE_DELAY) {
    long distance = measure_distance();
    lastCheck = now;
    
    if (distance <= EMERGENCY_DISTANCE) {
      stop_motor();
      update_lcd_status("EMERGENCY!", String(distance) + "cm");
    } else if (distance <= WARNING_DISTANCE) {
      int speed = map(distance, EMERGENCY_DISTANCE, WARNING_DISTANCE, 0, 255);
      set_motor_speed(speed);
      update_lcd_status("Slowing", String(distance) + "cm");
    } else {
      set_motor_speed(255);
    }
  }
}

void loop() {
  measure_distance_and_control_motors();  // Check distance and control motors
  get_gps_data();  // Continue with other sensor readings
}

void start_motor() {
  Serial.println("[MOTOR] Starting motors...");
  
  // Motor 1
  ledcWrite(MOTOR_PWM_CHANNEL_1, 255);
  digitalWrite(MOTOR_IN1, HIGH);
  digitalWrite(MOTOR_IN2, LOW);
  
  // Motor 2
  ledcWrite(MOTOR_PWM_CHANNEL_2, 255);
  digitalWrite(MOTOR_IN3, HIGH);
  digitalWrite(MOTOR_IN4, LOW);
  
  // Debug output
  Serial.println("[MOTOR] PWM values - Motor1: 255, Motor2: 255");
  Serial.println("[MOTOR] Direction pins - IN1: HIGH, IN2: LOW, IN3: HIGH, IN4: LOW");
  
  currentLcdState = LCD_STATE_ENGINE;
  update_lcd_status("Motors Running", "Full Power");
  delay(1000);
  
  // Initialize and show system values
  vehicleState.distance = measure_distance();
  vehicleState.alcoholLevel = check_alcohol();
  vehicleState.pulse = measure_bpm(PULSE_PIN, 5);
  
  // Show initial system values after motors start
  String line1 = String("D") + vehicleState.distance + 
                " A" + vehicleState.alcoholLevel;
  String line2 = String("HR:") + vehicleState.pulse + 
                (vehicleState.seatbelt ? " SB:ON" : " SB:OFF");
  update_lcd_status(line1, line2);
  
  lcdStateTimeout = millis() + DISPLAY_UPDATE_INTERVAL;
  currentLcdState = LCD_STATE_NORMAL;
}

void stop_motor() {
  // Stop both motors
  ledcWrite(MOTOR_PWM_CHANNEL_1, 0);
  ledcWrite(MOTOR_PWM_CHANNEL_2, 0);
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  digitalWrite(MOTOR_IN3, LOW);
  digitalWrite(MOTOR_IN4, LOW);
  
  update_lcd_status("Engines Status:", "Stopped");
  delay(1000);
}

void set_motor_speed(int speed) {
  speed = constrain(speed, 0, 255);
  
  // Set PWM for both motors
  ledcWrite(MOTOR_PWM_CHANNEL_1, speed);
  ledcWrite(MOTOR_PWM_CHANNEL_2, speed);
  
  // Keep direction pins set for forward
  digitalWrite(MOTOR_IN1, speed > 0 ? HIGH : LOW);
  digitalWrite(MOTOR_IN2, LOW);
  digitalWrite(MOTOR_IN3, speed > 0 ? HIGH : LOW);
  digitalWrite(MOTOR_IN4, LOW);
  
  Serial.printf("[MOTOR] Speed set to: %d\n", speed);
}

void IRAM_ATTR echoISR() {
  uint32_t now = micros();
  if (digitalRead(ULTRASONIC_ECHO) == HIGH) {
    pulseStart = now;
  } else if (pulseStart > 0) {
    currentDistance = ((now - pulseStart) * 34) / 2000;
    if (currentDistance >= ULTRASONIC_MIN_DIST && currentDistance <= ULTRASONIC_MAX_DIST) {
      newDistanceAvailable = true;
    }
    pulseStart = 0;
  }
}

void ultrasonicTask(void *pvParameters) {
  while (1) {
    GPIO.out_w1ts = (1 << ULTRASONIC_TRIG);
    asm("nop; nop; nop; nop; nop; nop; nop; nop;");
    GPIO.out_w1tc = (1 << ULTRASONIC_TRIG);
    vTaskDelay(pdMS_TO_TICKS(ULTRASONIC_INTERVAL));
  }
}

long measure_distance() {
  static long lastValidDistance = ULTRASONIC_MAX_DIST;
  static int errorCount = 0;
  
  if (!newDistanceAvailable) {
    errorCount++;
    if (errorCount > 10) {
      lastValidDistance = ULTRASONIC_MAX_DIST;
      errorCount = 0;
    }
    return lastValidDistance;
  }
  
  errorCount = 0;
  newDistanceAvailable = false;
  
  if (currentDistance < ULTRASONIC_MIN_DIST || currentDistance > ULTRASONIC_MAX_DIST) {
    return lastValidDistance;
  }
  
  lastValidDistance = currentDistance;
  
  // Control LED based on distance thresholds
  if (lastValidDistance < EMERGENCY_DISTANCE) {
    digitalWrite(DISTANCE_LED_PIN, HIGH);  // Solid ON for emergency
  } else if (lastValidDistance < WARNING_DISTANCE) {
    // Blink for warning
    if (millis() % 1000 < 500) {
      digitalWrite(DISTANCE_LED_PIN, HIGH);
    } else {
      digitalWrite(DISTANCE_LED_PIN, LOW);
    }
  } else {
    digitalWrite(DISTANCE_LED_PIN, LOW);  // OFF when safe
  }
  
  return currentDistance;
}

int check_alcohol() {
  long sum = 0;
  for (int i = 0; i < 5; i++) {
    int reading = analogRead(MQ3_PIN);
    sum += reading;
    Serial.printf("Alcohol Raw Reading %d: %d\n", i, reading);
    delay(ALCOHOL_READ_DELAY);
  }
  int alcoholLevel = sum / 5;
  
  // Force LED update and debug output
  bool isAlcoholDetected = alcoholLevel >= ALCOHOL_THRESHOLD;
  digitalWrite(ALCOHOL_LED_PIN, isAlcoholDetected ? HIGH : LOW);
  
  Serial.printf("Alcohol Level: %d, Threshold: %d, LED: %s\n", 
                alcoholLevel, ALCOHOL_THRESHOLD, 
                isAlcoholDetected ? "ON" : "OFF");
  
  return alcoholLevel;
}

int measure_bpm(int pin, int measurement_time_sec) {
  int beats = 0;
  bool above_threshold = false;
  unsigned long start_time = millis();
  unsigned long measurement_duration = measurement_time_sec * 1000;

  while (millis() - start_time < measurement_duration) {
    int raw_value = analogRead(pin);
    Serial.printf("Pulse Raw: %d\n", raw_value); // Debug output

    // Check if we have a pulse beat
    if (raw_value > PULSE_THRESHOLD && !above_threshold) {
      beats++;
      above_threshold = true;
      Serial.printf("Beat detected! Count: %d\n", beats);
    } else if (raw_value <= PULSE_THRESHOLD) {
      above_threshold = false;
    }

    delay(PULSE_SAMPLE_DELAY);  // Sample rate control
  }

  // Calculate BPM
  float seconds = measurement_duration / 1000.0;
  float bpm = (beats * 60.0) / seconds;
  
  Serial.printf("Measured BPM: %.1f over %d seconds\n", bpm, measurement_time_sec);
  
  // Validate the reading
  if (bpm >= MIN_BPM && bpm <= MAX_BPM) {
    // Store validated pulse data with timestamp
    pulseDataHistory[pulseDataIndex].timestamp = millis();
    pulseDataHistory[pulseDataIndex].value = (int)bpm;
    pulseDataIndex = (pulseDataIndex + 1) % PULSE_DATA_POINTS;

    // Store in regular history
    pulseHistory[pulseHistoryIndex] = (int)bpm;
    pulseHistoryIndex = (pulseHistoryIndex + 1) % PULSE_HISTORY_SIZE;

    Serial.printf("[PULSE] New reading: %d BPM at %lu ms\n", (int)bpm, millis());
    return (int)bpm;
  }
  
  // If invalid, keep last valid reading
  return (pulseHistoryIndex > 0) ? pulseHistory[(pulseHistoryIndex - 1) % PULSE_HISTORY_SIZE] : 0;
}

void send_to_backend() {
  if (!WiFi.isConnected()) return;
  
  static HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Clear and create fresh JSON document
  jsonDoc.clear();
  
  // Add timestamp in ISO format
  unsigned long uptime = millis() - startTime;
  char timestamp[25];
  snprintf(timestamp, sizeof(timestamp), "%lu000", uptime); // Convert to milliseconds
  
  jsonDoc["device_id"] = WiFi.macAddress();
  jsonDoc["timestamp"] = timestamp;
  jsonDoc["alcohol"] = vehicleState.alcoholLevel;
  jsonDoc["vibration"] = vehicleState.vibration;
  jsonDoc["distance"] = vehicleState.distance;
  jsonDoc["seatbelt"] = vehicleState.seatbelt;
  jsonDoc["impact"] = vehicleState.impact;
  jsonDoc["pulse"] = vehicleState.pulse;
  jsonDoc["lcd_display"] = currentLcdText;  // Add LCD display text

  // Always include GPS coordinates, even if they're 0
  if (gps.location.isValid()) {
      jsonDoc["lat"] = lat;
      jsonDoc["lng"] = lng;
      jsonDoc["gps_valid"] = true;
      jsonDoc["satellites"] = gps.satellites.value();
  } else {
      jsonDoc["gps_valid"] = false;
  }

  // Add current pulse reading separately for real-time display
  jsonDoc["current_pulse"] = vehicleState.pulse;
  jsonDoc["pulse_threshold_min"] = MIN_BPM;
  jsonDoc["pulse_threshold_max"] = MAX_BPM;

  // Add detailed pulse history with timestamps
  JsonArray pulseData = jsonDoc.createNestedArray("pulse_data");
  for (int i = 0; i < PULSE_DATA_POINTS; i++) {
    int idx = (pulseDataIndex - 1 - i + PULSE_DATA_POINTS) % PULSE_DATA_POINTS;
    if (pulseDataHistory[idx].timestamp > 0) {  // Only send valid readings
      JsonObject reading = pulseData.createNestedObject();
      reading["timestamp"] = pulseDataHistory[idx].timestamp;
      reading["value"] = pulseDataHistory[idx].value;
    }
  }

  // Add current readings to history arrays
  JsonArray pulseHistoryArray = jsonDoc.createNestedArray("pulse_history");
  JsonArray distanceHistory = jsonDoc.createNestedArray("distance_history");
  JsonArray alcoholHistory = jsonDoc.createNestedArray("alcohol_history");
  JsonArray impactHistory = jsonDoc.createNestedArray("impact_history");
  JsonArray vibrationHistory = jsonDoc.createNestedArray("vibration_history");

  // Add latest readings first
  for (int i = HISTORY_SIZE - 1; i >= 0; i--) {
    int idx = (sensorHistory.index - i + HISTORY_SIZE) % HISTORY_SIZE;
    pulseHistoryArray.add(sensorHistory.pulse[idx]);
    distanceHistory.add(sensorHistory.distance[idx]);
    alcoholHistory.add(sensorHistory.alcohol[idx]);
    impactHistory.add(sensorHistory.impact[idx]);
    vibrationHistory.add(sensorHistory.vibration[idx]);
  }

  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  int httpCode = http.POST(jsonString);
  Serial.printf("[HTTP] POST result: %d\n", httpCode);
  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    Serial.println("[HTTP] Response: " + response);
  }
  
  http.end();
}

void get_gps_data() {
    unsigned long currentMillis = millis();
    static unsigned long lastGpsUpdate = 0;
    static unsigned long lastGpsDisplay = 0;
    static bool is_braking = false;
    static unsigned long brake_start = 0;

    // Handle LCD state timeout
    if (currentLcdState != LCD_STATE_NORMAL && currentMillis > lcdStateTimeout) {
        currentLcdState = LCD_STATE_NORMAL;
    }

    // Read MPU6050 data
    mpu.getEvent(&a, &g, &temp);
    vehicleState.roll = atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI;
    vehicleState.pitch = atan2(-a.acceleration.x, sqrt(sq(a.acceleration.y) + sq(a.acceleration.z))) * 180.0 / PI;
    vehicleState.impact = sqrt(sq(a.acceleration.x) + sq(a.acceleration.y) + sq(a.acceleration.z));

    // Detect braking
    if (a.acceleration.x < -RAPID_DECEL_THRESHOLD && !is_braking) {
        is_braking = true;
        brake_start = currentMillis;
        update_lcd_status("!!! BRAKING !!!", String(abs(a.acceleration.x), 1) + "g force");
    } else if (!is_braking || (currentMillis - brake_start > 2000)) {
        is_braking = false;
        // Show all values on LCD in compact format
        String line1 = String("D") + vehicleState.distance +
                      " A" + vehicleState.alcoholLevel +
                      " I" + String(vehicleState.impact, 1);
        String line2 = String("HR:") + String(vehicleState.pulse) +
                      " H" + pulseHistory[((pulseHistoryIndex - 1 + PULSE_HISTORY_SIZE) % PULSE_HISTORY_SIZE)];
        update_lcd_status(line1, line2);
    }

    // Process GPS data with higher priority
    while (Serial1.available() > 0) {
        if (gps.encode(Serial1.read())) {
            if (gps.location.isValid()) {
                lat = gps.location.lat();
                lng = gps.location.lng();

                // Update LCD with GPS data every 2 seconds
                if (currentMillis - lastGpsDisplay >= 2000) {
                    lastGpsDisplay = currentMillis;
                    String line1 = String("GPS:") + String(lat, 4);
                    String line2 = String("Long:") + String(lng, 4);
                    update_lcd_status(line1, line2);
                }

                // Debug output every 5 seconds
                if (currentMillis - lastGpsUpdate >= 5000) {
                    lastGpsUpdate = currentMillis;
                    Serial.printf("[GPS] Position: %.6f, %.6f | Satellites: %d\n",
                        lat, lng, gps.satellites.value());
                }
            }
        }
    }

    // Check for GPS timeout
    if (millis() > 5000 && gps.charsProcessed() < 10) {
        Serial.println("[GPS] No GPS detected");
    }

    // Read sensors
    if (currentMillis - lastSensorRead >= SENSOR_UPDATE_INTERVAL) {
        lastSensorRead = currentMillis;

        // Update all sensor readings
        vehicleState.distance = measure_distance();
        vehicleState.alcoholLevel = check_alcohol();
        vehicleState.seatbelt = check_seat_belt();
        vehicleState.pulse = measure_bpm(PULSE_PIN, 5); // 5-second measurement window
        vehicleState.vibration = analogRead(VIBRATION_PIN);  // Add vibration reading

        // Store in history with bounds checking
        if (vehicleState.distance > 0 && vehicleState.distance <= ULTRASONIC_MAX_DIST) {
            sensorHistory.distance[sensorHistory.index] = vehicleState.distance;
        }
        sensorHistory.alcohol[sensorHistory.index] = vehicleState.alcoholLevel;
        sensorHistory.impact[sensorHistory.index] = vehicleState.impact;
        sensorHistory.pulse[sensorHistory.index] = vehicleState.pulse;
        sensorHistory.vibration[sensorHistory.index] = vehicleState.vibration;
        sensorHistory.index = (sensorHistory.index + 1) % HISTORY_SIZE;

        // Debug output
        Serial.printf("Sensor Update - D:%ld A:%d I:%.2f P:%d V:%d S:%s\n",
                     vehicleState.distance, vehicleState.alcoholLevel,
                     vehicleState.impact, vehicleState.pulse,
                     vehicleState.vibration, vehicleState.seatbelt ? "ON" : "OFF");
    }

    // Send data to backend
    if (currentMillis - lastBackendUpdate >= BACKEND_UPDATE_INTERVAL) {
        lastBackendUpdate = currentMillis;
        send_to_backend();
    }
}