# Matchmaking-Server
___

Servidor que gestiona el proceso de _matchmaking_, además de las cuentas, sesiones y versiones.


## Endpoints


###_/accounts_

Este servicio engloba todas las peticiones relacionadas con la gestión de cuentas (creación, borrado, petición de datos) y sesiones (inicio y cierre de sesión), además de encargarse de generar nuevos _auth tokens_ y de subir los resultados de una partida al historial de un jugador. Mientras no se indique lo contrario estos servicios requieren autorización, y utilizarán la información del _token_ para realizar sus tareas.


- **POST** _/accounts_: crea una nueva cuenta de usuario. No requiere autenticación.
    
    - _Parámetros_:
        
        - _nick_ (obligatorio | string): nombre de usuario.
        - _email_ (obligatorio | string): e-mail del usuario.
        - _password_ (obligatorio | string): contraseña del usuario. Esta contraseña se envía de forma segura al aplicar previamente el algoritmo SHA-256, de forma que en la base de datos nunca se guarde como texto plano.
        
    - _Respuestas_:
        
        - _200_: petición completada correctamente.
            
    
- **DELETE** _/accounts_: permite eliminar la cuenta de usuario.
    
    - _Respuestas_:
        
        - _200_: petición completada correctamente.
            
    
- **GET** _/accounts/check-availability_: permite verificar si un e-mail y/o un nombre de usuario proporcionados están en uso. No requiere autenticación.
    
    - _Parámetros_ (debe proporcionarse al menos uno):
        
        - _nick_ (obligatorio* | query | string): nombre de usuario.
        - _email_ (obligatorio* | query | string): e-mail del usuario.
        
    - _Respuestas_:
        
        - _200_: petición completada correctamente.
            
            - _emailAvailable_: indica si está libre el e-mail proporcionado.
            - _nickAvailable_: indica si está libre el nombre de usuario proporcionado.
                    
            
    
- **POST** _/accounts/sessions_: verifica las credenciales proporcionados y, de ser válidas, abre una sesión (_login_) y genera un _auth token_ y un _refresh token_ para el usuario. No requiere autenticación.
    
    - _Parámetros_:
        
        - Debe proporcionarse al menos uno:
            
            - _nick_ (obligatorio* | string): nombre de usuario.
            - _email_ (obligatorio* | string): e-mail del usuario.
            
        - _password_ (obligatorio | string): contraseña cifrada del usuario.
        
    - _Respuestas_:
        
        - _404_: no se ha encontrado un usuario con esos credenciales.
        - _200_: petición completada correctamente.
            
            - _id_: id del usuario.
            - _accessToken_: _access token_ de esta sesión del usuario, que expira tras 5 minutos.
            - _refreshToken_: _refresh token_ de esta sesión del usuario.
                    
            
    
- **DELETE** _/accounts/sessions_: permite cerrar una sesión (_logout_), e invalida tanto el _auth token_ como el _refresh token_ proporcionados.
    
    - _Parámetros_:
        
        - _refreshToken_ (obligatorio | string): _refresh token_ de la sesión a cerrar.
        
    - _Respuestas_:
        
        - _200_: petición completada correctamente.
            
    
- **POST** _/accounts/sessions/refresh_: dado un _refresh token_, si este se corresponde a una sesión aún abierta, permite generar un _auth token_ nuevo para renovar una sesión caducada. Realiza autenticación mediante el _refresh token_.
    
    - _Parámetros_:
        
        - _refreshToken_ (obligatorio | string): _refresh token_ de la sesión a renovar.
        
    - _Respuestas_:
        
        - _200_: petición completada correctamente.
                
            - _accessToken_ (string): nuevo _access token_ para esta sesión, que expirará otra vez tras 5 minutos.
                    
            
    
- **GET** _/accounts/by-id/{id}_: permite pedir información acerca de un jugador, dado su id. No requiere autenticación.
    
    - _Parámetros_:
        
        - _id_ (obligatorio | path | int): id del usuario a buscar. Se incluye en la URL.
        
    - _Respuestas_:
        
        - _404_: no se ha encontrado un usuario.
        - _200_: petición completada correctamente. La respuesta consiste en toda la información del usuario almacenada en la base de datos, quitando el id interno de la base de datos e información importante como su contraseña cifrada (mediante la aplicación del algoritmo SHA-256, mencionado previamente) y su correo electrónico.
            
    
- **GET** _/accounts/by-nick/{nick}_: permite pedir información acerca de un jugador, dado su nombre de usuario. No requiere autenticación.
    
    - _Parámetros_:
        
        - _nick_ (obligatorio | path | string): nombre del usuario a buscar. Se incluye en la URL.
        
    - _Respuestas_:
        
        - _404_: no se ha encontrado un usuario.
        - _200_: petición completada correctamente. La respuesta consiste en toda la información del usuario almacenada en la base de datos, quitando el id interno de la base de datos e información importante como su contraseña y su correo electrónico.
            
    
- **POST** _/accounts/rounds_: permite subir la información de una partida (resultados, otros datos que se hayan recopilado, etc.) a la base de datos, añadiéndose al historial de un usuario. El diseñador puede definir el formato de esta información como desee.
    
    - _Respuestas_:
        
        - _200_: petición completada correctamente.
                
        



###_/matchmaking_

Este servicio engloba todas las peticiones relacionadas con el proceso de emparejado. Todos estos servicios requieren autorización, y utilizarán la información del _token_ para realizar sus tareas.


- **POST** _/matchmaking_: añade al usuario a la lista de espera. Se realiza en su propio servicio por seguir el estándar de REST.
    
    - _Parámetros_:
        
        - _waitTime_ (query | float): indica al servidor el tiempo (en milisegundos) que lleva esperando un jugador antes de entrar en la lista de espera. Tiene 0 como valor por defecto.
        
    - _Respuestas_:
        
        - _200_: petición completada correctamente.
            
    
- **GET** _/matchmaking_: toma el usuario y, de estar en la lista de espera, trata de emparejarlo con otro, realizando además una limpieza de la lista (eliminando usuarios que lleven mucho tiempo sin realizar una petición).
    
    - _Parámetros_:

        - _waitTime_ (query | float): indica al servidor el tiempo (en milisegundos) que lleva esperando un jugador antes de entrar en la lista de espera. Tiene 0 como valor por defecto.

    - _Respuestas_:

        - _404_: el usuario indicado no se halla en la lista de espera.
        - _200_: petición completada correctamente.
            
            - _found_ (bool): indica si se ha encontrado un rival óptimo. En caso de ser falso, los parámetros restantes no se definen.
            - _finished_ (bool): en caso de que este usuario aún no haya sido emparejado con otro usuario, devuelve falso. En caso contrario, verdadero.
            - _rivalID_ (int): id del rival encontrado.
            - _rivalNick_ (string): nombre de usuario del rival encontrado.
            - _bestRivalRating_ (float): puntuación del rival encontrado.
            - _bestRivalRD_ (float): RD del rival encontrado.
            - _myRating_ (float): puntuación del usuario en ese momento.
            - _myRD_ (float): RD del usuario en ese momento.
                    
            
    
- **DELETE** _/matchmaking_: elimina el usuario de la lista de espera. Se llama en caso de cancelar la búsqueda de pareja o de haberse encontrado.
    
    - _Respuestas_:

        - _404_: el usuario indicado no se halla en la lista de espera.
        - _200_: petición completada correctamente.



###_/version_

Este servicio solo cuenta con una petición, cuyo objetivo es ofrecer un control de versiones. No requiere autorización.


- **GET** _/version_: proporciona el número de versión del juego designada en el servidor. Sirve para evitar que jugadores con versiones antiguas se conecten con otros jugadores, para evitar errores.
    
    - _Respuestas_:
            
        - _200_: petición completada correctamente.
                    
            - _version_ (string): la versión actual guardada en el servidor.
                        
                
        
