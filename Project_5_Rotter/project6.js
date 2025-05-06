var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);
	for ( int i=0; i<NUM_LIGHTS; ++i ) {

		// TO-DO: Check for shadows
		Light currentLight = lights[i];

		//Set offset
		float eps = 1e-5;

		//Create a ray from the position to the current light position
		Ray shadowRay;
		shadowRay.dir = normalize(currentLight.position - position);
		shadowRay.pos = position + eps * shadowRay.dir; //offset to avoid self-shadowing

		//Create an empty hitinfo
		HitInfo hitinfo; 

		//Check that hit is not further away then light
		float distToLight = length(currentLight.position - position);

		if(IntersectRay(hitinfo, shadowRay) && hitinfo.t < distToLight){
			continue;
		}else{
			// TO-DO: If not shadowed, perform shading using the Blinn model

			//Normalize the vectors we need to calculate the angles
			vec3 n = normalize(normal);
			vec3 omega = normalize(shadowRay.dir);
			vec3 v = normalize(view); //View direction towards the camera
			vec3 h = normalize(omega+v); //Get the half way vector h

			//Calculate the Binn reflection
			color += currentLight.intensity*(max(dot(omega,n),0.0)*mtl.k_d + mtl.k_s*pow(max(dot(n, h),0.0),mtl.n));	
		}

		
	}
	return color;
}


// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
    hit.t = 1e30;
    bool foundHit = false;  

    for (int i = 0; i < NUM_SPHERES; ++i) {
        Sphere S = spheres[i]; //asingns current sphere
        vec3  oc = ray.pos - S.center; //For easier handling

        float a = dot(ray.dir, ray.dir);
        float b = 2.0 * dot(ray.dir, oc);
        float c = dot(oc, oc) - S.radius * S.radius;
        float disc = b*b - 4.0*a*c;
        if (disc < 0.0){ //Check that discriminator is valid
			continue;
		}

        float t = (-b - sqrt(disc)) / (2.0 * a);
        if (t < 1e-5 || t >= hit.t){ //continue the loop if the t is not small eneugh (also avoid self reflection)
			continue;
		} 

		//Update the hitinfo and wheter theres a hit found
        hit.t = t;
        hit.position = ray.pos + t * ray.dir;
        hit.normal = normalize(hit.position - S.center);
        hit.mtl = S.mtl;
        foundHit = true;
    }

    return foundHit;
}


// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		
		// Compute reflections
		vec3 k_s = hit.mtl.k_s;
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
			
			Ray r;	// this is the reflection ray
			HitInfo h;	// reflection hit info
			
			// TO-DO: Initialize the reflection ray
			float eps = 1e-5;
			r.dir = reflect(ray.dir, hit.normal);
			r.pos = hit.position + eps * r.dir;
			
			if ( IntersectRay( h, r ) ) {
				// TO-DO: Hit found, so shade the hit point
				view = normalize(-r.dir);
				vec3 reflectedClr = Shade( h.mtl, h.position, h.normal, view );

				// Accumulate the reflected color
				clr += k_s * reflectedClr;

				// TO-DO: Update the loop variables for tracing the next reflection ray
				k_s *= h.mtl.k_s;
				hit = h;
				ray = r;
			} else {
				// The refleciton ray did not intersect with anything,
				// so we are using the environment color
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;	// no more reflections
			}
		}
		return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
	}
}
`;