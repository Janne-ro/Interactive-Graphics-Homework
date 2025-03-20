//Function that multiplys two 3x3 matricies
function matrixMult(matrix1, matrix2){
	let finalMatrix = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	  ];
	
	//Iterate through columns and rows
	for (let i = 0; i < 3; i++) { //Row 1st
		for (let j = 0; j < 3; j++) { //Column 2nd
			for (let k = 0; k < 3; k++) { //Pos in row/column
				finalMatrix[i][j] += matrix1[i][k] * matrix2[k][j];
			}
		}
	}
	return finalMatrix;
}

//Function that turns a 3x3 matrix to a Column major array
function toColumnMajor(matrix){
	let result = [];
	//Iterate through columns and rows
	for (let i = 0; i < 3; i++){ //Column
		for (let j = 0; j < 3; j++){ //Row
			result.push(matrix[j][i]);
		}
	}
	return result;
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform( positionX, positionY, rotation, scale ){

	//Create scale matrix --> apparently scale is 1D meaning we can only zoom in and out
	const scaleMatrix = [
		[scale, 0, 0],  
		[0, scale, 0],  
		[0, 0, 1]   
	];

	//Create rotation matrix
	const rotationInRadians = rotation * (Math.PI / 180);
	//Ensure correct rotation direction
	const rotationMatrix = [
		[Math.cos(rotationInRadians), -Math.sin(rotationInRadians),0],
		[Math.sin(rotationInRadians), Math.cos(rotationInRadians),0],
		[0, 0, 1]
	];

	//Create translation matrix
	const translationMatrix = [
		[1, 0, positionX],  
		[0, 1, positionY],  
		[0, 0, 1]   
	];

	//return the final matrix translationMatrix*rotationMatrix*scaleMatrix
	return toColumnMajor(matrixMult(matrixMult(translationMatrix, rotationMatrix), scaleMatrix));
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 ){
	const transformation1 = [
		[trans1[0], trans1[3], trans1[6]],
		[trans1[1], trans1[4], trans1[7]],
		[trans1[2], trans1[5], trans1[8]]
	];

	const transformation2 = [
		[trans2[0], trans2[3], trans2[6]],
		[trans2[1], trans2[4], trans2[7]],
		[trans2[2], trans2[5], trans2[8]]
	];

	return toColumnMajor(matrixMult(transformation2,transformation1));
}
