from flask import Flask, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from flask_cors import CORS
import logging
import traceback

# Set up logging with more detail
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8080", "http://localhost:5002", "*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

DB_CONFIG = {
    'host': 'geoserver-db.cnkgu4oqgnjn.eu-central-1.rds.amazonaws.com',
    'database': 'geoserver_db',
    'user': 'postgres',
    'password': 'postgres'
}

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        raise

def test_db_connection():
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT version()')
            version = cur.fetchone()[0]
            return True, version
    except Exception as e:
        return False, str(e)
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/layers', methods=['GET'])
def get_layers():
    try:
        country = request.args.get('country', 'Kenya')
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get all layer data for the country
                layers = {
                    "forest_presence_view": {
                        "name": "Presence of Forest",
                        "workspace": "it.geosolutions",
                        "type": "vector",
                        "data": []
                    },
                    "deforestation_view": {
                        "name": "Prevalence of Deforestation",
                        "workspace": "it.geosolutions",
                        "type": "vector",
                        "data": []
                    },
                    "social_GHR": {
                        "name": "Governance and Human Rights",
                        "workspace": "it.geosolutions",
                        "type": "vector",
                        "data": []
                    },
                    "coffee_regions_view": {
                        "name": "Coffee Region",
                        "workspace": "it.geosolutions",
                        "type": "vector",
                        "data": []
                    }
                }
                
                # Fetch data for each layer
                cur.execute("SELECT For_R_Perc FROM forest_presence_view WHERE country = %s", (country,))
                layers["forest_presence_view"]["data"] = cur.fetchall()
                
                cur.execute("SELECT Def_R_Perc FROM deforestation_view WHERE country = %s", (country,))
                layers["deforestation_view"]["data"] = cur.fetchall()
                
                cur.execute("SELECT Ccrit_1_sc FROM social_GHR WHERE country = %s", (country,))
                layers["social_GHR"]["data"] = cur.fetchall()
                
                cur.execute("SELECT coffee_reg FROM coffee_regions_view WHERE country = %s", (country,))
                layers["coffee_regions_view"]["data"] = cur.fetchall()
                
                return jsonify(layers)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/layer_data/<layer_name>', methods=['GET', 'OPTIONS'])
def get_layer_data(layer_name):
    try:
        if request.method == 'OPTIONS':
            return '', 204
            
        country = request.args.get('country', 'Kenya')
        states = request.args.getlist('states[]')
        municipalities = request.args.getlist('municipalities[]')

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                base_query = f"""
                    SELECT *
                    FROM {layer_name}
                    WHERE country = %s
                """
                params = [country]

                # Only add filters if they are provided
                if states:
                    states_list = ','.join([f"'{state}'" for state in states])
                    base_query += f""" AND "StateName" IN ({states_list})"""
                
                if municipalities:
                    munis_list = ','.join([f"'{muni}'" for muni in municipalities])
                    base_query += f""" AND "Muni_Name" IN ({munis_list})"""

                logger.debug(f"Executing query: {base_query} with params: {params}")
                cur.execute(base_query, params)
                data = cur.fetchall()
                
                response = jsonify(data)
                # Add CORS headers
                response.headers.add('Access-Control-Allow-Origin', '*')
                response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
                response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
                return response
                
    except Exception as e:
        logger.error(f"Error in get_layer_data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/regions', methods=['GET'])
def get_regions():
    try:
        logger.info("Regions endpoint called")
        country = request.args.get('country')
        state = request.args.get('state')
        
        logger.debug(f"Request parameters - country: {country}, state: {state}")
        
        if not country:
            logger.warning("Missing country parameter")
            return jsonify({
                "error": "Missing parameter",
                "message": "Country parameter is required"
            }), 400

        # Test database connection first
        try:
            conn = get_db_connection()
            logger.info("Database connection successful")
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            return jsonify({
                "error": "Database connection failed",
                "message": str(e)
            }), 500

        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # First verify country exists
                logger.debug(f"Verifying country: {country}")
                try:
                    cur.execute("""
                        SELECT DISTINCT country 
                        FROM forest_presence_view 
                        WHERE country = %s
                        LIMIT 1;
                    """, (country,))
                    
                    result = cur.fetchone()
                    logger.debug(f"Country verification result: {result}")
                    
                    if not result:
                        logger.warning(f"No data found for country: {country}")
                        return jsonify({
                            "error": "Country not found",
                            "message": f"No data found for country: {country}"
                        }), 404
                except Exception as e:
                    logger.error(f"Error verifying country: {str(e)}")
                    raise

                # Get states
                logger.debug(f"Fetching states for country: {country}")
                try:
                    cur.execute("""
                        SELECT 
                            s."StateName" as statename,
                            COUNT(*) as region_count
                        FROM (
                            SELECT DISTINCT "StateName" 
                            FROM forest_presence_view 
                            WHERE country = %s AND "StateName" IS NOT NULL
                            UNION
                            SELECT DISTINCT "StateName" 
                            FROM deforestation_view 
                            WHERE country = %s AND "StateName" IS NOT NULL
                            UNION
                            SELECT DISTINCT "StateName" 
                            FROM coffee_regions_view 
                            WHERE country = %s AND "StateName" IS NOT NULL
                        ) s
                        GROUP BY s."StateName"
                        ORDER BY s."StateName";
                    """, (country, country, country))
                    states = cur.fetchall()
                    logger.debug(f"Found states: {states}")
                except Exception as e:
                    logger.error(f"Error fetching states: {str(e)}")
                    raise

                # Get municipalities
                logger.debug(f"Fetching municipalities for country: {country}")
                try:
                    cur.execute("""
                        SELECT 
                            m."Muni_Name" as muni_name,
                            m."StateName" as state_name,
                            COUNT(*) as municipality_count
                        FROM (
                            SELECT DISTINCT "Muni_Name", "StateName"
                            FROM forest_presence_view 
                            WHERE country = %s AND "Muni_Name" IS NOT NULL
                            UNION
                            SELECT DISTINCT "Muni_Name", "StateName"
                            FROM deforestation_view 
                            WHERE country = %s AND "Muni_Name" IS NOT NULL
                            UNION
                            SELECT DISTINCT "Muni_Name", "StateName"
                            FROM coffee_regions_view 
                            WHERE country = %s AND "Muni_Name" IS NOT NULL
                        ) m
                        GROUP BY m."Muni_Name", m."StateName"
                        ORDER BY m."Muni_Name";
                    """, (country, country, country))
                    municipalities = cur.fetchall()
                    logger.debug(f"Found municipalities: {municipalities}")
                except Exception as e:
                    logger.error(f"Error fetching municipalities: {str(e)}")
                    raise

                response_data = {
                    'states': states,
                    'municipalities': municipalities
                }
                logger.debug(f"Sending response: {response_data}")
                return jsonify(response_data)

        except psycopg2.Error as e:
            logger.error(f"Database error: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({
                "error": "Database error",
                "message": str(e)
            }), 500
        finally:
            if conn:
                conn.close()
                logger.debug("Database connection closed")

    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Server error",
            "message": str(e)
        }), 500

# Add error handler for 500 errors
@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({
        "error": "Internal server error",
        "message": str(error)
    }), 500

# Add error handler for 404 errors
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({
        "error": "Not found",
        "message": str(error)
    }), 404

@app.route('/api/test-db', methods=['GET'])
def test_db():
    success, result = test_db_connection()
    if success:
        return jsonify({
            "status": "success",
            "message": "Database connection successful",
            "version": result
        })
    else:
        return jsonify({
            "status": "error",
            "message": "Database connection failed",
            "error": result
        }), 500

@app.route('/api/healthcheck', methods=['GET'])
def healthcheck():
    try:
        logger.debug("Healthcheck endpoint accessed")
        success, result = test_db_connection()
        
        if success:
            return jsonify({
                "status": "healthy",
                "database": "connected",
                "message": "All systems operational",
                "db_version": result
            })
        else:
            return jsonify({
                "status": "unhealthy",
                "database": "disconnected",
                "error": result
            }), 500
            
    except Exception as e:
        logger.error(f"Healthcheck failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Disable Flask's default error catching during debug
    app.config['TRAP_HTTP_EXCEPTIONS'] = True
    app.run(host='0.0.0.0', port=5001, debug=True)