// FireSnowBridge.java: Prosty REST API bridge do bazy FireSnow
// 
// Ten program łączy się z bazą FireSnow i udostępnia dane przez REST API
// Używa tylko Java 8 (kompatybilne z JRE z FireSnow)

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.InetSocketAddress;
import java.sql.*;
import java.util.Properties;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.sql.PreparedStatement;

public class FireSnowBridge {
    
    private static String DB_URL;
    private static String DB_USER;
    private static String DB_PASSWORD;
    private static int API_PORT;
    
    // Connection pooling with TTL (Time To Live)
    private static Connection connection = null;
    private static long lastRefresh = 0;
    private static final long TTL = 120000; // 2 minutes in milliseconds
    
    /**
     * Loads configuration from config.properties file
     */
    private static void loadConfig() {
        System.out.println("FireSnowBridge: Loading configuration...");
        Properties props = new Properties();
        
        try (FileInputStream fis = new FileInputStream("config.properties")) {
            props.load(fis);
            
            DB_URL = props.getProperty("db.url", "jdbc:hsqldb:hsql://192.168.8.48:9001/FireSport_database_4");
            DB_USER = props.getProperty("db.user", "SA");
            DB_PASSWORD = props.getProperty("db.password", "");
            API_PORT = Integer.parseInt(props.getProperty("api.port", "8080"));
            
            System.out.println("FireSnowBridge: Configuration loaded successfully");
            System.out.println("FireSnowBridge: Database URL: " + DB_URL);
            System.out.println("FireSnowBridge: API Port: " + API_PORT);
            
        } catch (IOException e) {
            System.err.println("FireSnowBridge: Error loading config.properties, using defaults");
            DB_URL = "jdbc:hsqldb:hsql://192.168.8.48:9001/FireSport_database_4";
            DB_USER = "SA";
            DB_PASSWORD = "";
            API_PORT = 8080;
        }
    }
    
    /**
     * Creates READ-ONLY connection to FireSnow database with automatic TTL refresh
     * Connections older than 2 minutes are automatically closed and reopened
     * This ensures we always read fresh data from disk
     */
    private static Connection getConnection() throws SQLException {
        long now = System.currentTimeMillis();
        
        // Check if connection is expired (older than TTL)
        if (connection != null && (now - lastRefresh > TTL)) {
            System.out.println("FireSnowBridge: Connection expired (> 2 min), closing...");
            try {
                connection.close();
            } catch (SQLException e) {
                // Ignore errors when closing
                System.err.println("FireSnowBridge: Error closing expired connection: " + e.getMessage());
            }
            connection = null;
            System.gc(); // Suggest garbage collection to free memory
        }
        
        // Open new connection if needed
        if (connection == null || connection.isClosed()) {
            System.out.println("FireSnowBridge: Opening fresh connection...");
            System.out.println("FireSnowBridge: URL: " + DB_URL);
            
            connection = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
            
            // Force READ-ONLY mode for safety!
            connection.setReadOnly(true);
            
            lastRefresh = now;
            
            System.out.println("FireSnowBridge: Fresh connection established (will auto-refresh in 2 min)");
        }
        
        return connection;
    }
    
    /**
     * Closes all database connections and forces garbage collection
     * This allows next request to read fresh data from disk
     * Used by /api/refresh endpoint for manual refresh
     */
    private static synchronized void closeAllConnections() {
        System.out.println("FireSnowBridge: Manual refresh requested - closing all connections");
        
        if (connection != null) {
            try {
                connection.close();
                System.out.println("FireSnowBridge: Connection closed successfully");
            } catch (SQLException e) {
                System.err.println("FireSnowBridge: Error closing connection: " + e.getMessage());
            }
            connection = null;
        }
        
        // Reset timestamp to force new connection
        lastRefresh = 0;
        
        // Suggest garbage collection
        System.gc();
        
        System.out.println("FireSnowBridge: All connections closed, next request will read fresh data");
    }
    
    /**
     * Handler for endpoint /api/health
     * Checks if API is running and can connect to database
     */
    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("FireSnowBridge: Health check requested");
            
            setCorsHeaders(exchange);
            
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            
            try (Connection conn = getConnection()) {
                String response = "{\"status\":\"ok\",\"database\":\"connected\",\"message\":\"FireSnow Bridge API is running\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(200, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
                
                System.out.println("FireSnowBridge: Health check OK");
                
            } catch (SQLException e) {
                System.err.println("FireSnowBridge: Database connection failed: " + e.getMessage());
                String response = "{\"status\":\"error\",\"database\":\"disconnected\",\"error\":\"" + 
                                escapeJson(e.getMessage()) + "\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(500, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
            }
        }
    }
    
    /**
     * Handler for endpoint /api/rezerwacje/aktywne
     * Returns list of active reservations
     */
    static class AktywnRezerwacjeHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("FireSnowBridge: Active reservations requested");
            
            setCorsHeaders(exchange);
            
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            
            try (Connection conn = getConnection()) {
                
                // Fixed SQL with correct column names (discovered via Database Manager)
                // Używamy ABSTRACTENTITYCM dla nazwy klienta (tak jak w wypożyczeniach)
                // i RENT_CUSTOMERS dla imienia/nazwiska jako fallback
                String sql = 
                    "SELECT " +
                    "  rp.ID as rezerwacja_id, " +
                    "  p.NAME as nazwa_sprzetu, " +
                    "  ae.CODE as kod_sprzetu, " +
                    "  rp.BEGINDATE as data_od, " +
                    "  rp.ENDDATE as data_do, " +
                    "  rp.PRICE as cena, " +
                    "  rp.RENTOBJECT_ID as obiekt_id, " +
                    "  rp.CUSTOMER_ID as klient_id, " +
                    "  ae_customer.NAME as klient_nazwa, " +
                    "  rc.FORENAME as imie, " +
                    "  rc.SURNAME as nazwisko, " +
                    "  rc.PHONE1 as telefon " +
                    "FROM RESERVATIONPOSITION rp " +
                    "JOIN ABSTRACTPOSITION p ON p.ID = rp.ID " +
                    "LEFT JOIN ABSTRACTENTITYCM ae ON ae.ID = rp.RENTOBJECT_ID " +
                    "LEFT JOIN ABSTRACTENTITYCM ae_customer ON ae_customer.ID = rp.CUSTOMER_ID " +
                    "LEFT JOIN RENT_CUSTOMERS rc ON rc.ID = rp.CUSTOMER_ID " +
                    "WHERE rp.ENDDATE > CURRENT_TIMESTAMP " +
                    "ORDER BY rp.BEGINDATE";
                
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql);
                
                StringBuilder json = new StringBuilder("[");
                boolean first = true;
                
                while (rs.next()) {
                    if (!first) json.append(",");
                    first = false;
                    
                    json.append("{");
                    json.append("\"rezerwacja_id\":").append(rs.getLong("rezerwacja_id")).append(",");
                    json.append("\"nazwa_sprzetu\":\"").append(escapeJson(rs.getString("nazwa_sprzetu"))).append("\",");
                    json.append("\"kod_sprzetu\":\"").append(escapeJson(rs.getString("kod_sprzetu"))).append("\",");
                    json.append("\"data_od\":\"").append(rs.getTimestamp("data_od")).append("\",");
                    json.append("\"data_do\":\"").append(rs.getTimestamp("data_do")).append("\",");
                    json.append("\"cena\":").append(rs.getDouble("cena")).append(",");
                    json.append("\"obiekt_id\":").append(rs.getLong("obiekt_id")).append(",");
                    json.append("\"klient_id\":").append(rs.getLong("klient_id")).append(",");
                    json.append("\"klient_nazwa\":\"").append(escapeJson(rs.getString("klient_nazwa"))).append("\",");
                    json.append("\"imie\":\"").append(escapeJson(rs.getString("imie"))).append("\",");
                    json.append("\"nazwisko\":\"").append(escapeJson(rs.getString("nazwisko"))).append("\",");
                    json.append("\"telefon\":\"").append(escapeJson(rs.getString("telefon"))).append("\"");
                    json.append("}");
                }
                
                json.append("]");
                
                rs.close();
                stmt.close();
                
                String response = json.toString();
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(200, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
                
                System.out.println("FireSnowBridge: Returned active reservations");
                
            } catch (SQLException e) {
                System.err.println("FireSnowBridge: Database error: " + e.getMessage());
                e.printStackTrace();
                
                String response = "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(500, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
            }
        }
    }
    
    /**
     * Handler for endpoint /api/wypozyczenia/przeszle
     * Returns list of past rentals (returned items, STOPTIME != 0)
     */
    static class PrzeszleWypozyczeniaHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("FireSnowBridge: Past rentals requested");
            
            setCorsHeaders(exchange);
            
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            
            try (Connection conn = getConnection()) {
                
                // SQL query for past rentals from SESSIONINFOFGHJ table
                String sql = 
                    "SELECT " +
                    "  si.ID as session_id, " +
                    "  si.STARTTIME as data_od, " +
                    "  si.STOPTIME as data_do, " +
                    "  si.REMAININGTIME as pozostaly_czas, " +
                    "  si.PRICE as cena, " +
                    "  si.PAYMENT as zaplacono, " +
                    "  si.RENTOBJECT_ID as obiekt_id, " +
                    "  si.CUSTOMER_ID as klient_id, " +
                    "  si.RENTDOCUMENT_ID as dokument_id, " +
                    "  ae_customer.NAME as klient_nazwa, " +
                    "  ae_equipment.NAME as nazwa_sprzetu, " +
                    "  ae_equipment.CODE as kod_sprzetu, " +
                    "  doc.NUMBER as numer_dokumentu " +
                    "FROM SESSIONINFOFGHJ si " +
                    "LEFT JOIN ABSTRACTENTITYCM ae_customer ON ae_customer.ID = si.CUSTOMER_ID " +
                    "LEFT JOIN ABSTRACTENTITYCM ae_equipment ON ae_equipment.ID = si.RENTOBJECT_ID " +
                    "LEFT JOIN ABSTRACTDOCUMENT doc ON doc.ID = si.RENTDOCUMENT_ID " +
                    "WHERE si.STOPTIME != 0 " +  // != 0 = returned rental
                    "ORDER BY si.STOPTIME DESC";
                
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql);
                
                StringBuilder json = new StringBuilder("[");
                boolean first = true;
                
                while (rs.next()) {
                    if (!first) json.append(",");
                    first = false;
                    
                    json.append("{");
                    json.append("\"session_id\":").append(rs.getLong("session_id")).append(",");
                    json.append("\"nazwa_sprzetu\":\"").append(escapeJson(rs.getString("nazwa_sprzetu"))).append("\",");
                    json.append("\"kod_sprzetu\":\"").append(escapeJson(rs.getString("kod_sprzetu"))).append("\",");
                    json.append("\"data_od\":").append(rs.getLong("data_od")).append(",");
                    json.append("\"data_do\":").append(rs.getLong("data_do")).append(",");
                    json.append("\"pozostaly_czas\":").append(rs.getLong("pozostaly_czas")).append(",");
                    json.append("\"cena\":").append(rs.getDouble("cena")).append(",");
                    json.append("\"zaplacono\":").append(rs.getDouble("zaplacono")).append(",");
                    json.append("\"obiekt_id\":").append(rs.getLong("obiekt_id")).append(",");
                    json.append("\"klient_id\":").append(rs.getLong("klient_id")).append(",");
                    json.append("\"dokument_id\":").append(rs.getLong("dokument_id")).append(",");
                    json.append("\"klient_nazwa\":\"").append(escapeJson(rs.getString("klient_nazwa"))).append("\",");
                    json.append("\"numer_dokumentu\":\"").append(escapeJson(rs.getString("numer_dokumentu"))).append("\"");
                    json.append("}");
                }
                
                json.append("]");
                
                rs.close();
                stmt.close();
                
                String response = json.toString();
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(200, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
                
                System.out.println("FireSnowBridge: Returned past rentals");
                
            } catch (SQLException e) {
                System.err.println("FireSnowBridge: Database error: " + e.getMessage());
                e.printStackTrace();
                
                String response = "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(500, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
            }
        }
    }
    
    /**
     * Handler for endpoint /api/narty/zarezerwowane
     * Returns list of reserved skis (grouped, which are occupied)
     */
    static class ZarezerwowaneNartyHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("FireSnowBridge: Reserved skis requested");
            
            setCorsHeaders(exchange);
            
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            
            try (Connection conn = getConnection()) {
                
                // Fixed SQL - use ABSTRACTPOSITION not ABSTRACTPRODUCT (NAME column is there)
                String sql = 
                    "SELECT DISTINCT " +
                    "  ro.ID as obiekt_id, " +
                    "  p.NAME as nazwa, " +
                    "  p.CODE as kod " +
                    "FROM RENTOBJECTS ro " +
                    "JOIN ABSTRACTPOSITION p ON p.ID = ro.ID " +
                    "WHERE ro.ID IN ( " +
                    "  SELECT RENTOBJECT_ID " +
                    "  FROM RESERVATIONPOSITION " +
                    "  WHERE ENDDATE > CURRENT_TIMESTAMP " +
                    ") " +
                    "ORDER BY p.NAME";
                
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql);
                
                StringBuilder json = new StringBuilder("[");
                boolean first = true;
                
                while (rs.next()) {
                    if (!first) json.append(",");
                    first = false;
                    
                    json.append("{");
                    json.append("\"obiekt_id\":").append(rs.getLong("obiekt_id")).append(",");
                    json.append("\"nazwa\":\"").append(escapeJson(rs.getString("nazwa"))).append("\",");
                    json.append("\"kod\":\"").append(escapeJson(rs.getString("kod"))).append("\"");
                    json.append("}");
                }
                
                json.append("]");
                
                rs.close();
                stmt.close();
                
                String response = json.toString();
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(200, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
                
                System.out.println("FireSnowBridge: Returned reserved skis");
                
            } catch (SQLException e) {
                System.err.println("FireSnowBridge: Database error: " + e.getMessage());
                e.printStackTrace();
                
                String response = "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(500, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
            }
        }
    }
    
    /**
     * Handler for endpoint /api/wypozyczenia/aktualne
     * Returns list of active rentals (currently with customer)
     */
    static class AktywneWypozyczeniaHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("FireSnowBridge: Active rentals requested");
            
            setCorsHeaders(exchange);
            
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            
            try (Connection conn = getConnection()) {
                
                // SQL query for active rentals from SESSIONINFOFGHJ table
                String sql = 
                    "SELECT " +
                    "  si.ID as session_id, " +
                    "  si.STARTTIME as data_od, " +
                    "  si.STOPTIME as data_do, " +
                    "  si.REMAININGTIME as pozostaly_czas, " +
                    "  si.PRICE as cena, " +
                    "  si.PAYMENT as zaplacono, " +
                    "  si.RENTOBJECT_ID as obiekt_id, " +
                    "  si.CUSTOMER_ID as klient_id, " +
                    "  si.RENTDOCUMENT_ID as dokument_id, " +
                    "  ae_customer.NAME as klient_nazwa, " +
                    "  ae_equipment.NAME as nazwa_sprzetu, " +
                    "  ae_equipment.CODE as kod_sprzetu, " +
                    "  doc.NUMBER as numer_dokumentu " +
                    "FROM SESSIONINFOFGHJ si " +
                    "LEFT JOIN ABSTRACTENTITYCM ae_customer ON ae_customer.ID = si.CUSTOMER_ID " +
                    "LEFT JOIN ABSTRACTENTITYCM ae_equipment ON ae_equipment.ID = si.RENTOBJECT_ID " +
                    "LEFT JOIN ABSTRACTDOCUMENT doc ON doc.ID = si.RENTDOCUMENT_ID " +
                    "WHERE si.STOPTIME = 0 " +  // 0 = active rental
                    "ORDER BY si.STARTTIME DESC";
                
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql);
                
                StringBuilder json = new StringBuilder("[");
                boolean first = true;
                
                while (rs.next()) {
                    if (!first) json.append(",");
                    first = false;

                    long dataOd = rs.getLong("data_od");
                    long dataDo = rs.getLong("data_do");
                    long pozostalyCzas = rs.getLong("pozostaly_czas");
                    
                    // Oblicz data_do dla aktywnych wypożyczeń (gdy data_do = 0)
                    if (dataDo == 0 && pozostalyCzas > 0) {
                        dataDo = dataOd + pozostalyCzas;
                    }
                    
                    json.append("{");
                    json.append("\"session_id\":").append(rs.getLong("session_id")).append(",");
                    json.append("\"nazwa_sprzetu\":\"").append(escapeJson(rs.getString("nazwa_sprzetu"))).append("\",");
                    json.append("\"kod_sprzetu\":\"").append(escapeJson(rs.getString("kod_sprzetu"))).append("\",");
                    json.append("\"data_od\":").append(rs.getLong("data_od")).append(",");
                    json.append("\"data_do\":").append(rs.getLong("data_do")).append(",");
                    json.append("\"pozostaly_czas\":").append(rs.getLong("pozostaly_czas")).append(",");
                    json.append("\"cena\":").append(rs.getDouble("cena")).append(",");
                    json.append("\"zaplacono\":").append(rs.getDouble("zaplacono")).append(",");
                    json.append("\"obiekt_id\":").append(rs.getLong("obiekt_id")).append(",");
                    json.append("\"klient_id\":").append(rs.getLong("klient_id")).append(",");
                    json.append("\"dokument_id\":").append(rs.getLong("dokument_id")).append(",");
                    json.append("\"klient_nazwa\":\"").append(escapeJson(rs.getString("klient_nazwa"))).append("\",");
                    json.append("\"numer_dokumentu\":\"").append(escapeJson(rs.getString("numer_dokumentu"))).append("\"");
                    json.append("}");
                }
                
                json.append("]");
                
                rs.close();
                stmt.close();
                
                String response = json.toString();
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(200, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
                
                System.out.println("FireSnowBridge: Returned active rentals");
                
            } catch (SQLException e) {
                System.err.println("FireSnowBridge: Database error: " + e.getMessage());
                e.printStackTrace();
                
                String response = "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(500, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
            }
        }
    }
    /**
 * Handler for endpoint /api/dostepnosc/okres
 * Returns reservations and rentals that conflict or are close to the given date range
 * Used for "Przeglądaj" - optimized for performance
 */
static class DostepnoscOkresHandler implements HttpHandler {
    @Override
    public void handle(HttpExchange exchange) throws IOException {
        System.out.println("FireSnowBridge: Availability check for date range requested");
        
        setCorsHeaders(exchange);
        
        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }
        
        try (Connection conn = getConnection()) {
            // Get query parameters
            String query = exchange.getRequestURI().getQuery();
            Map<String, String> params = parseQuery(query);
            
            // Default: current year if no dates provided
            long dateFrom = params.containsKey("from") ? 
                Long.parseLong(params.get("from")) : 1735689600000L; // 2025-01-01
            long dateTo = params.containsKey("to") ? 
                Long.parseLong(params.get("to")) : Long.MAX_VALUE;
            
            // Calculate buffer dates (±2 days for yellow warnings)
            long bufferBefore = dateFrom - (2L * 24 * 60 * 60 * 1000); // -2 days
            long bufferAfter = dateTo + (2L * 24 * 60 * 60 * 1000);   // +2 days
            
            // Convert timestamps to Date objects for SQL
            java.util.Date dateFromDate = new java.util.Date(dateFrom);
            java.util.Date dateToDate = new java.util.Date(dateTo);
            java.util.Date bufferBeforeDate = new java.util.Date(bufferBefore);
            java.util.Date bufferAfterDate = new java.util.Date(bufferAfter);
            
            // SQL dla rezerwacji - tylko te które mogą kolidować
            String sqlReservations = 
                "SELECT " +
                "  rp.ID as rezerwacja_id, " +
                "  p.NAME as nazwa_sprzetu, " +
                "  ae.CODE as kod_sprzetu, " +
                "  rp.BEGINDATE as data_od, " +
                "  rp.ENDDATE as data_do, " +
                "  rp.CUSTOMER_ID as klient_id, " +
                "  ae_customer.NAME as klient_nazwa, " +
                "  rc.FORENAME as imie, " +
                "  rc.SURNAME as nazwisko " +
                "FROM RESERVATIONPOSITION rp " +
                "JOIN ABSTRACTPOSITION p ON p.ID = rp.ID " +
                "LEFT JOIN ABSTRACTENTITYCM ae ON ae.ID = rp.RENTOBJECT_ID " +
                "LEFT JOIN ABSTRACTENTITYCM ae_customer ON ae_customer.ID = rp.CUSTOMER_ID " +
                "LEFT JOIN RENT_CUSTOMERS rc ON rc.ID = rp.CUSTOMER_ID " +
                "WHERE rp.ENDDATE >= ? " +  // Koniec rezerwacji >= początek bufora
                "  AND rp.BEGINDATE <= ? " +  // Początek rezerwacji <= koniec bufora
                "  AND rp.BEGINDATE >= TIMESTAMP '2025-01-01 00:00:00' " +
                "ORDER BY rp.BEGINDATE";
            
            // SQL dla wypożyczeń aktywnych
            String sqlRentals = 
                "SELECT " +
                "  si.ID as session_id, " +
                "  si.STARTTIME as data_od, " +
                "  si.STOPTIME as data_do, " +
                "  si.REMAININGTIME as pozostaly_czas, " +
                "  si.RENTOBJECT_ID as obiekt_id, " +
                "  si.CUSTOMER_ID as klient_id, " +
                "  ae_customer.NAME as klient_nazwa, " +
                "  ae_equipment.NAME as nazwa_sprzetu, " +
                "  ae_equipment.CODE as kod_sprzetu " +
                "FROM SESSIONINFOFGHJ si " +
                "LEFT JOIN ABSTRACTENTITYCM ae_customer ON ae_customer.ID = si.CUSTOMER_ID " +
                "LEFT JOIN ABSTRACTENTITYCM ae_equipment ON ae_equipment.ID = si.RENTOBJECT_ID " +
                "WHERE si.STOPTIME = 0 " +
                "  AND si.STARTTIME >= 1735689600000 " +  // 2025-01-01
                "  AND (si.STARTTIME + COALESCE(si.REMAININGTIME, 0)) >= ? " +  // Koniec wypożyczenia >= początek bufora
                "  AND si.STARTTIME <= ? " +  // Początek wypożyczenia <= koniec bufora
                "ORDER BY si.STARTTIME DESC";
            
            // Execute queries
            PreparedStatement stmtRes = conn.prepareStatement(sqlReservations);
            stmtRes.setTimestamp(1, new Timestamp(bufferBeforeDate.getTime()));
            stmtRes.setTimestamp(2, new Timestamp(bufferAfterDate.getTime()));
            
            PreparedStatement stmtRent = conn.prepareStatement(sqlRentals);
            stmtRent.setLong(1, bufferBefore);
            stmtRent.setLong(2, bufferAfter);
            
            ResultSet rsRes = stmtRes.executeQuery();
            ResultSet rsRent = stmtRent.executeQuery();
            
            // Build JSON response
            StringBuilder json = new StringBuilder("{\"reservations\":[");
            boolean firstRes = true;
            
            while (rsRes.next()) {
                if (!firstRes) json.append(",");
                firstRes = false;
                
                String klientNazwa = rsRes.getString("klient_nazwa");
                if (klientNazwa == null || klientNazwa.trim().isEmpty()) {
                    String imie = rsRes.getString("imie");
                    String nazwisko = rsRes.getString("nazwisko");
                    if (imie != null || nazwisko != null) {
                        klientNazwa = ((imie != null ? imie : "") + " " + (nazwisko != null ? nazwisko : "")).trim();
                    }
                }
                if (klientNazwa == null || klientNazwa.trim().isEmpty()) {
                    klientNazwa = "Klient #" + rsRes.getLong("klient_id");
                }
                
                json.append("{");
                json.append("\"kod\":\"").append(escapeJson(rsRes.getString("kod_sprzetu"))).append("\",");
                json.append("\"od\":\"").append(rsRes.getTimestamp("data_od")).append("\",");
                json.append("\"do\":\"").append(rsRes.getTimestamp("data_do")).append("\",");
                json.append("\"klient\":\"").append(escapeJson(klientNazwa)).append("\",");
                json.append("\"sprzet\":\"").append(escapeJson(rsRes.getString("nazwa_sprzetu"))).append("\"");
                json.append("}");
            }
            
            json.append("],\"rentals\":[");
            boolean firstRent = true;
            
            while (rsRent.next()) {
                if (!firstRent) json.append(",");
                firstRent = false;
                
                long dataOd = rsRent.getLong("data_od");
                long dataDo = rsRent.getLong("data_do");
                long pozostalyCzas = rsRent.getLong("pozostaly_czas");
                
                if (dataDo == 0 && pozostalyCzas > 0) {
                    dataDo = dataOd + pozostalyCzas;
                }
                
                String klientNazwa = rsRent.getString("klient_nazwa");
                if (klientNazwa == null || klientNazwa.trim().isEmpty()) {
                    klientNazwa = "Klient #" + rsRent.getLong("klient_id");
                }
                
                json.append("{");
                json.append("\"kod\":\"").append(escapeJson(rsRent.getString("kod_sprzetu"))).append("\",");
                json.append("\"od\":").append(dataOd).append(",");
                json.append("\"do\":").append(dataDo).append(",");
                json.append("\"klient\":\"").append(escapeJson(klientNazwa)).append("\",");
                json.append("\"sprzet\":\"").append(escapeJson(rsRent.getString("nazwa_sprzetu"))).append("\"");
                json.append("}");
            }
            
            json.append("]}");
            
            rsRes.close();
            rsRent.close();
            stmtRes.close();
            stmtRent.close();
            
            String response = json.toString();
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(200, response.getBytes(StandardCharsets.UTF_8).length);
            
            OutputStream os = exchange.getResponseBody();
            os.write(response.getBytes(StandardCharsets.UTF_8));
            os.close();
            
            System.out.println("FireSnowBridge: Returned availability data for date range");
            
        } catch (SQLException e) {
            System.err.println("FireSnowBridge: Database error: " + e.getMessage());
            e.printStackTrace();
            
            String response = "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(500, response.getBytes(StandardCharsets.UTF_8).length);
            
            OutputStream os = exchange.getResponseBody();
            os.write(response.getBytes(StandardCharsets.UTF_8));
            os.close();
        }
    }
    
    private static Map<String, String> parseQuery(String query) {
        Map<String, String> params = new HashMap<>();
        if (query == null) return params;
        for (String param : query.split("&")) {
            String[] pair = param.split("=");
            if (pair.length == 2) {
                params.put(pair[0], pair[1]);
            }
        }
        return params;
    }
}
    
    /**
     * Sets CORS headers to allow frontend connection
     */
    private static void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
    }
    
    /**
     * Escapes special characters in JSON
     */
    private static String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
    
    /**
     * Handler for endpoint /api/refresh
     * Forces manual refresh by closing all connections
     * Next request will read fresh data from disk
     */
    static class RefreshHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("FireSnowBridge: /api/refresh endpoint called");
            
            setCorsHeaders(exchange);
            
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            
            try {
                // Close all connections to force fresh read on next request
                closeAllConnections();
                
                String response = "{\"status\":\"ok\",\"message\":\"Database connections refreshed. Next request will read fresh data from disk.\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(200, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
                
                System.out.println("FireSnowBridge: Manual refresh completed successfully");
                
            } catch (Exception e) {
                System.err.println("FireSnowBridge: Refresh failed: " + e.getMessage());
                e.printStackTrace();
                
                String response = "{\"status\":\"error\",\"message\":\"" + escapeJson(e.getMessage()) + "\"}";
                
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
                exchange.sendResponseHeaders(500, response.getBytes(StandardCharsets.UTF_8).length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes(StandardCharsets.UTF_8));
                os.close();
            }
        }
    }
    
    /**
     * Main method - starts HTTP server
     */
    public static void main(String[] args) {
        System.out.println("===========================================");
        System.out.println("   FireSnow Bridge API                    ");
        System.out.println("   READ-ONLY connection to FireSnow DB    ");
        System.out.println("===========================================");
        System.out.println();
        
        try {
            // Load HSQLDB driver
            Class.forName("org.hsqldb.jdbc.JDBCDriver");
            System.out.println("FireSnowBridge: HSQLDB driver loaded");
            
            // Load configuration
            loadConfig();
            
            // Test database connection
            System.out.println("FireSnowBridge: Testing database connection...");
            try (Connection conn = getConnection()) {
                System.out.println("FireSnowBridge: Database connection OK!");
            }
            
            // Create HTTP server
            HttpServer server = HttpServer.create(new InetSocketAddress(API_PORT), 0);
            
            // Register endpoints
            server.createContext("/api/health", new HealthHandler());
            server.createContext("/api/refresh", new RefreshHandler());
            server.createContext("/api/rezerwacje/aktywne", new AktywnRezerwacjeHandler());
            server.createContext("/api/wypozyczenia/aktualne", new AktywneWypozyczeniaHandler());
            server.createContext("/api/wypozyczenia/przeszle", new PrzeszleWypozyczeniaHandler());
            server.createContext("/api/narty/zarezerwowane", new ZarezerwowaneNartyHandler());
            server.createContext("/api/dostepnosc/okres", new DostepnoscOkresHandler());
            // Start server
            server.setExecutor(null); // Default executor
            server.start();
            
            System.out.println();
            System.out.println("===========================================");
            System.out.println("✓ FireSnow Bridge API is running!");
            System.out.println("===========================================");
            System.out.println();
            System.out.println("API URL: http://localhost:" + API_PORT);
            System.out.println();
            System.out.println("Available endpoints:");
            System.out.println("  GET /api/health                    - Check API status");
            System.out.println("  GET /api/refresh                   - Refresh database cache");
            System.out.println("  GET /api/rezerwacje/aktywne       - Get active reservations");
            System.out.println("  GET /api/wypozyczenia/aktualne    - Get active rentals");
            System.out.println("  GET /api/wypozyczenia/przeszle    - Get past rentals (returned)");
            System.out.println("  GET /api/narty/zarezerwowane      - Get reserved skis");
            System.out.println("  GET /api/dostepnosc/okres         - Get availability for date range"); // NOWY
            System.out.println();
            System.out.println("Press Ctrl+C to stop the server");
            System.out.println("===========================================");
            
        } catch (ClassNotFoundException e) {
            System.err.println("ERROR: HSQLDB driver not found!");
            System.err.println("Make sure hsqldb.jar is in the lib/ folder");
            System.exit(1);
            
        } catch (SQLException e) {
            System.err.println("ERROR: Cannot connect to database!");
            System.err.println("Check config.properties settings");
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
            
        } catch (IOException e) {
            System.err.println("ERROR: Cannot start HTTP server!");
            System.err.println("Port " + API_PORT + " may be already in use");
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
}

