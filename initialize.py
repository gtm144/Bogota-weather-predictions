import time
import zipfile
import requests
import xmltodict, io
import json
import geopandas as gpd

actual_time = round(time.time())
print(actual_time)


#Fetch data from API
try: resp = requests.get("http://imrad.sire.gov.co:8080/radar/reflectividad.kmz?rand=%s" % actual_time)
except: print("Error fetching API")
resp= zipfile.ZipFile(io.BytesIO(resp.content))
resp.extractall('reflec')
resp = resp.open('doc.kml', 'r').read()
resp = xmltodict.parse(resp)
img_radar = resp["kml"]["Folder"]["GroundOverlay"]["Icon"]["href"]

# First, get distance for map´s latitude and longitude
img_loc = resp["kml"]["Folder"]["GroundOverlay"]["LatLonBox"]
hor_loc = float(img_loc["east"]) - float(img_loc["west"])
ver_loc = float(img_loc["north"]) - float(img_loc["south"])
print("Distance horizontal " + str(hor_loc) + " and vertical " + str(ver_loc) + "layer")


with open('source/map_area_hex8.json') as f:
    bogota_hex8 = json.load(f)
bogota_hex = json.loads(bogota_hex8)
bogota_hex =  gpd.GeoDataFrame(bogota_hex['features'])
bogota_hex.head(2)