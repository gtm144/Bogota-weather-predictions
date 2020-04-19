var map, state = false;
var fechalectura;
var estadoimg;
var nombreEstacion = "Estación";
var altoIcon;
var anchoIcon;
var latitudCorreo = datosURL('latitud');
var longitudCorreo = datosURL('longitud');
require([
    "esri/map",
    "esri/layers/KMLLayer",
    "esri/dijit/BasemapGallery",
    "esri/arcgis/utils",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/FeatureLayer", "esri/geometry/Point",
    "dijit/TooltipDialog", "dijit/popup", "esri/lang",
    "esri/symbols/PictureMarkerSymbol", "esri/graphic", "esri/layers/GraphicsLayer", "esri/InfoTemplate", "esri/tasks/IdentifyTask",
    "esri/tasks/IdentifyParameters", "esri/layers/OpenStreetMapLayer",
    "dojo/dom", "dojo/on", "dojo/query", "dojo/_base/array", "dojo/parser", "dojo/dom-style", "dojo/request",
    "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dojo/domReady!"
], function (
        Map, KMLLayer, BasemapGallery, arcgisUtils, ArcGISTiledMapServiceLayer, FeatureLayer, Point,
        TooltipDialog, dijitPopup, esriLang,
        PictureMarkerSymbol, Graphic, GraphicsLayer, InfoTemplate, IdentifyTask, IdentifyParameters, OpenStreetMapLayer,
        dom, on, query, array, parser, domStyle, request
        ) {

    ///
    ///	Creando mapa base de IDECA
    ///
    var basemaps = [];
    //var urideca = "https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/Mapa_Referencia/mapa_base_3857/MapServer";
    var urideca="";
	var idecaTemplateLayer = new esri.dijit.BasemapLayer({
        url: urideca
    });
    var idecaBasemap = new esri.dijit.Basemap({
        layers: [idecaTemplateLayer], title: "IDECA", thumbnailUrl: "img/ideca.jpg"
    });
    basemaps.push(idecaBasemap);
    ///
    ///	Inicializando mapa
    ///
    var latitud = 4.626853707360377;
    var longitud = -74.0682993486343;
    var zoom = 11;
	
	if(latitudCorreo != "" && longitudCorreo != ""){
        latitud = parseFloat(latitudCorreo);
        longitud = parseFloat(longitudCorreo);
        zoom = 13;
    }
   
    if (screen.width < 1024) {
        zoom = 10;
        latitud = 4.651;
        longitud = -74.098;
    }
    map = new Map("map", {
        basemap: "osm",
        center: [longitud, latitud],
        zoom: zoom,
		 minZoom: 7, 
        showInfoWindowOnClick: true
    });
    var graphicLayer = new GraphicsLayer();
    graphicLayer.setRefreshInterval(0.1);
    map.addLayer(graphicLayer, 100);
    setTimeout(function () {
        map.reorderLayer(graphicLayer, 100);
//        console.log("Graphic layer reordenado")
    }, 5000);

    request.get(urideca, {headers: {"X-Requested-With": null}}).then(
            function (response) {
                map.setBasemap(idecaBasemap);
            },
            function (error) {
                console.log("error cargando ideca:  " + error);
            }
    );
    parser.parse();
    ///
    ///	Cargando KMZ de localidades y radar en el mapa
    ///
    var uri = "http://imrad.sire.gov.co:8080/radar/reflectividad.kmz"
    var kmlUrl = uri + "?rand=" + new Date().getTime();
    var radar = new KMLLayer(kmlUrl);
    radar.refreshInterval = 0.17;
    radar.setVisibility(true);
    map.addLayer(radar);
    ///
    ///	Permite cargar servicios geográficos externos de ArcGIS en el mapa
    ///
    var featureLayer = new FeatureLayer("https://mapas.sire.gov.co:8447/arcgis/rest/services/Precipitacion/MapServer/2");
    featureLayer.setVisibility(false);
    map.addLayer(featureLayer);
    ///
    ///	Manejo de eventos sobre las capas y el mapa
    ///
    radar.on("load", function (evt) {
        // console.log(evt.layer);     
        // console.log("kmz del radar cargado");	  
    });

    map.on("click", function (evt) {
        //console.log(" layer clickeado " + evt.layer);
        if (evt.graphic != null && evt.graphic.infoTemplate == null)
            map.infoWindow.hide();
    });

    map.on("load", function () {
        map.infoWindow.hide();
        sensoresxTiposensores(5);
        graphicLayer.enableMouseEvents();
        graphicLayer.on("mouse-over", openDialog);
        graphicLayer.on("mouse-out", closeDialog);
        document.getElementById("map_zoom_slider").className = document.getElementById("map_zoom_slider").className.replace(/\esriSimpleSliderTL\b/, '');
        document.getElementById("map_zoom_slider").className += " esriSimpleSliderTR";
        var domNodes = query('.logo-med', this.domNode);
//        domNodes[0].style.display = 'none';
        domNodes = query('div.titlePane', this.domNode);
        domNodes[0].style.backgroundColor = "#FFFFFF";
        domNodes[0].style.height = "23px";
        domNodes[0].style.paddingTop = "4px";
    });
    graphicLayer.on("load", function () {
        console.log("Graphic layer refrescado");
    });
    ///
    ///	Funcionalidad que permite agregar tooltips a los markers
    ///
    var dialog = new TooltipDialog({
        id: "tooltipDialog",
        style: "position: absolute;   font: normal normal normal 8px Helvetica"
    });
    dialog.startup();
    function openDialog(evt) {
        var tooltip = "${NombreEstacion}";
        if (evt.graphic.attributes != null && !state) {
            var content = esriLang.substitute(evt.graphic.attributes, tooltip);
            dialog.setContent(content);
            domStyle.set(dialog.domNode, "opacity", 1);
            dijitPopup.open({popup: dialog, x: evt.pageX, y: evt.pageY, orient: ["before-centered", "after-centered"]});
            state = true;
        }
    }

    function closeDialog() {
        //console.log(cont + " close state " + state);
        if (state) {
            setTimeout(function () {
                dijitPopup.close(dialog);
                state = false;
            }, 1000);
        }
    }

    /**
     Se envía el tipo de sensor y retorna toda la información para mostrar en el mapa
     **/
    function sensoresxTiposensores(idtiposensor) {
        try {
            $.ajax({
                url: "/sab/ServletTipoSensores",
                type: 'POST',
                dataType: 'json',
                context: document.body,
                data: {
                    "idtiposensor": idtiposensor
                },
                success: function (datos) {
                    getMostrarmarcadores(datos);
                }
            });
        } catch (e) {
            console.log(e.message);
        }
    }

    ///
    ///	Funcionalidad que permite cargar puntos personalizados con leyenda sobre el mapa
    ///
    function getMostrarmarcadores(datos) {
        var tiposensores = datos.TipoSensores;
        var marker;
        for (var i = 0; i < tiposensores.length; i++) {
            var content = "";
            estadoimg = tiposensores[i].IDTIPOSENSOR;
            valorLectura = tiposensores[i].VALORLECTURA;
            fechalectura = tiposensores[i].FECHALECTURA;
            var fechaLectura1 = fechalectura;
            var fechaLectura2 = fechalectura;
            var d = new Date();
            var fechafuera = new Date(fechaLectura1);
            var fecLec = fechafuera.getTime();
            var fecAc = d.getTime();
            var total = fecAc - fecLec;
            var estado = tiposensores[i].ESTADO;
            var unidad = tiposensores[i].UNIDADMEDIDA;
            var acumuladodia = tiposensores[i].ACUMULADODIA;

            if (fechalectura != null) {
                var str = fechalectura;
                var res = str.split(" ", 1);
                fechaLectura1 = str.slice(11, 16);
                var res1 = str.split(" ", 1);
                fechaLectura2 = str.slice(0, 11);
            }

            if (valorLectura > 0 && acumuladodia > 0 && acumuladodia <= 10 && estadoimg === 5) {
                if (screen.width < 1024) {
                    imagen = "/sab/img/movil/" + estadoimg + "1.gif";
                } else {
                    imagen = "/sab/img/" + estadoimg + "1.gif";
                }
            } else {
                if (valorLectura > 0 && acumuladodia > 10 && acumuladodia <= 30 && estadoimg === 5) {
                    if (screen.width < 1024) {
                        imagen = "/sab/img/movil/" + estadoimg + "2T.gif";
                    } else {
                        imagen = "/sab/img/" + estadoimg + "2T.gif";
                    }
                } else {
                    if (valorLectura > 0 && acumuladodia > 30 && acumuladodia <= 50 && estadoimg === 5) {
                        if (screen.width < 1024) {
                            imagen = "/sab/img/movil/" + estadoimg + "3T.gif";
                        } else {
                            imagen = "/sab/img/" + estadoimg + "3T.gif";
                        }
                    } else {
                        if (valorLectura > 0 && acumuladodia > 30 && estadoimg === 5) {
                            if (screen.width < 1024) {
                                imagen = "/sab/img/movil/" + estadoimg + "4T.gif";
                            } else {
                                imagen = "/sab/img/" + estadoimg + "4T.gif";
                            }
                        } else {
                            //                        if (lluvias == true && acumuladodia > 0) {
                            if (acumuladodia > 0 && acumuladodia <= 10 && estadoimg === 5) {
                                if (screen.width < 1024) {
                                    imagen = "/sab/img/movil/" + estadoimg + "11.png";
                                } else {
                                    imagen = "/sab/img/" + estadoimg + "11.png";
                                    //                            }
                                }
                            } else {
                                if (acumuladodia > 10 && acumuladodia <= 30 && estadoimg === 5) {
                                    if (screen.width < 1024) {
                                        imagen = "/sab/img/movil/" + estadoimg + "22.png";
                                    } else {
                                        imagen = "/sab/img/" + estadoimg + "22.png";
                                    }
                                } else {
                                    if (acumuladodia > 30 && acumuladodia <= 50 && estadoimg === 5) {
                                        if (screen.width < 1024) {
                                            imagen = "/sab/img/movil/" + estadoimg + "33.png";
                                        } else {
                                            imagen = "/sab/img/" + estadoimg + "33.png";
                                        }
                                    } else {
                                        if (acumuladodia > 50 && estadoimg === 5) {
                                            if (screen.width < 1024) {
                                                imagen = "/sab/img/movil/" + estadoimg + "44.png";
                                            } else {
                                                imagen = "/sab/img/" + estadoimg + "44.png";
                                            }
                                        } else {
                                            if (estadoimg === 5) {
                                                if (screen.width < 1024) {
                                                    imagen = "/sab/img/movil/" + estadoimg + "1T.png";
                                                } else {
                                                    imagen = "/sab/img/" + estadoimg + "1T.png";
                                                }
                                                //                                            imagen = "/sab/img/" + estadoimg + "1.gif";
                                            } else {
                                                if (screen.width < 1024) {
                                                    //íconos diferentes a lluvia
                                                    imagen = "/sab/img/movil/" + estadoimg + "1.png";
                                                } else {
                                                    imagen = "/sab/img/" + estadoimg + "1.png";
                                                }
                                                //íconos diferentes a lluvia
                                            }
                                        }
                                    }
                                }

                            }
                        }
                    }
                }
            }


            var tecnologia = tiposensores[i].TIPOTECNOLOGIA;
            var unidadmedida = tiposensores[i].UNIDADMEDIDA;
            var estacion = tiposensores[i].ESTACION;
            var idsensorEstacion = tiposensores[i].IDSENSOR + estacion;
            if (unidad == "Milimetros") {
                unidad = "mm";
            }
             content = "<style>tr{border: #DEDEDE 1px solid;} td{padding: 6px;}</style><table style='font-family: sans-serif;border-collapse: collapse;top: -25px;position: relative;' border='1'><tr><th bgcolor='#F5F4F4' colspan ='2' style='color: #787777;text-align: center;font-weight: bold;height: 28px; padding: 5px;text-transform: capitalize;'> ";
            var localidadM = tiposensores[i].LOCALIDAD.toLowerCase();
            content += "</br>Estación " + tiposensores[i].ESTACION;
            content += "</br>" + localidadM;
            content += "</th> </tr></br>";
            content += "<tr><td>Fecha Última lectura: </td><td style='text-align: center;'><b>" + fechaLectura2 + "</b> </br></td><tr>";
            content += "<tr><td>Hora Última lectura: </td><td style='text-align: center;'><b>" + fechaLectura1 + "</b> </br></td><tr>";
            content += "<tr><td>Acumulado de hoy (" + unidad + "):  </td><td style='text-align: center;'><b> " + acumuladodia + "</b></td><tr></table> </br>";
            content += "<center><input data-dojo-type='dijit/form/Button' type='button' style='position: relative; top: -35px;padding: 5px;' ; onclick=abrirgraficas('" + tiposensores[i].IDSENSOR + "','" + acumuladodia + "'); value='Ver registros'></center>";
            var point = new Point({latitude: tiposensores[i].LATITUD, longitude: tiposensores[i].LONGITUD});
            var pictureMarkerSymbol = new PictureMarkerSymbol(imagen, 18, 18);
            var template = new InfoTemplate("Titulo", content);
            graphicLayer.add(new Graphic(point, pictureMarkerSymbol, {"NombreEstacion": nombreEstacion + " " + tiposensores[i].ESTACION}, template));
//            graphicLayer.setRefreshInterval(0.17);
            //graphicLayer.setOpacity(0.8);
            map.addLayer(graphicLayer);
            //  map.graphics.add(new Graphic(point, pictureMarkerSymbol, null, template));
        }

    }

    ///
    ///	Funcionalidad que permite cargar las coordenadas del centro del mapa
    ///
    function getCenterMap()
    {
        if (map.extent != null) {
            var point = map.extent.getCenter();
            console.log("Centro x:y " + point.getLatitude() + ", " + point.getLongitude());
        }
    }

    ///
    ///	Función que permite prender y apagar capas geográficas
    ///
    on(dom.byId("btnradar"), "change", updateLayerVisibility);
    function updateLayerVisibility() {
        radar.setVisibility(dom.byId("btnradar").checked);
    }
    ///
    ///	Inicializa la galería de mapas base de ArcGIS
    ///
    var basemapGallery = new BasemapGallery({
        showArcGISBasemaps: true,
        map: map,
        basemaps: basemaps
    }, "basemapGallery");

    basemapGallery.startup();

    basemapGallery.on("error", function (msg) {
        //console.log("basemap gallery error:  ", msg);
    });
});

/**
 * Abris página de gráficas
 * @param {type} url
 * @returns {undefined}
 */
document.write("<" + "script type='text/javascript' src='/sab/js/grafica.js'><" + "/script>");
function abrirgraficas(idesensor, acumuladoDia) {
    $.ajax({
        url: "/sab/ServletTipoSensores",
        type: 'POST',
        dataType: 'json',
        context: document.body,
        data: {
            "idtiposensor": 5
        },
        success: function (datos) {
            var estacionT;
            var localidad;
//            var acumuladoDia;
            tiposensores = datos.TipoSensores;
            for (var i = 0; i < tiposensores.length; i++) {
                if (tiposensores[i].IDSENSOR == idesensor) {
                    estacionT = tiposensores[i].ESTACION;
                    localidad = tiposensores[i].LOCALIDAD;
//                    acumuladoDia = tiposensores[i].ACUMULADODIA;
                }
            }
            var graficas = "<iframe id='frame' scrolling='no' allowtransparency='true'  style='border:0px; margin:0 auto; position:absolute; right:0; left:0;' height='636px' width='95%' src='/sab/faces/graficas.xhtml?idsensorv=" + idesensor + "&tiposensorv=" + estadoimg + "&medidav=" + unidadmedida + "&estacionv=" + estacionT + "&acumuladoDiav=" + acumuladoDia + "&localidadv=" + localidad + "'></iframe>";
            if (estadoimg == 5) {
                $(".grafica").css("height", "639px");
            }
            $(".grafica").html(graficas);
            $(".grafica").show(1000);
        }
    });
}
function datosURL(name) {
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var tmpURL = window.location.href;
    var results = regex.exec(tmpURL);
    if (results == null) {
        return "";
    } else {
        return results[1];
    }
}
$(document).ready(function () {

});